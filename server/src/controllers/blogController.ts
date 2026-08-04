import type { Request, Response } from 'express';
import { isValidObjectId, Types, type RootFilterQuery } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { BlogPost } from '../models/BlogPost.js';
import { BlogComment } from '../models/BlogComment.js';
import { BlogReaction } from '../models/BlogReaction.js';
import type { IBlogPost } from '../types/index.js';
import { destroyAsset } from '../config/cloudinary.js';

export const BLOG_REACTIONS = [
  'like',
  'love',
  'clap',
  'insightful',
  'fire',
] as const;

const summarizeReactions = async (postId: string) => {
  const reactions = await BlogReaction.aggregate<{
    _id: string;
    count: number;
  }>([
    { $match: { post: new Types.ObjectId(postId) } },
    { $group: { _id: '$reaction', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  const totalReactions = reactions.reduce((sum, item) => sum + item.count, 0);
  return { reactions, totalReactions };
};

/**
 * A post is publicly visible if it's published, OR scheduled with its time
 * already due (the model also auto-promotes scheduled→published on next save;
 * this query keeps it correct without a cron — Vercel serverless has none).
 */
export const publicVisibility = (): RootFilterQuery<IBlogPost> => ({
  $or: [
    { status: 'published' },
    { status: 'scheduled', scheduledFor: { $lte: new Date() } },
  ],
});

/** Escape regex metacharacters so a search term is matched literally
 *  (prevents invalid-regex 500s on inputs like "C++" and closes the
 *  regex-injection / ReDoS surface on this public endpoint). */
const escapeRegex = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Public — visible posts only, paginated, with ?tag & ?q search. */
export const listPublished = asyncHandler(
  async (req: Request, res: Response) => {
    // Self-heal: promote any scheduled posts whose time has arrived so their
    // publishedAt is set (Vercel serverless has no cron; the model otherwise
    // only promotes on .save()). Keeps ordering + displayed dates correct.
    await BlogPost.updateMany(
      { status: 'scheduled', scheduledFor: { $lte: new Date() } },
      [
        {
          $set: {
            status: 'published',
            publishedAt: { $ifNull: ['$publishedAt', '$scheduledFor'] },
          },
        },
      ]
    );

    const page = Math.max(1, parseInt(String(req.query.page)) || 1);
    const limit = Math.min(50, parseInt(String(req.query.limit)) || 9);
    const and: RootFilterQuery<IBlogPost>[] = [publicVisibility()];
    if (req.query.q) {
      const q = escapeRegex(String(req.query.q).slice(0, 100));
      and.push({
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { excerpt: { $regex: q, $options: 'i' } },
        ],
      });
    }
    const filter: RootFilterQuery<IBlogPost> = { $and: and };
    if (req.query.tag) filter.tags = String(req.query.tag);

    const [posts, total] = await Promise.all([
      BlogPost.find(filter)
        .select('-content')
        .sort({ featured: -1, publishedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      BlogPost.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }
);

/** Public — single published post by slug (increments views). */
export const getPublishedBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const visitorKey = String(req.query.visitorKey || '').trim();
    const post = await BlogPost.findOneAndUpdate(
      { slug: req.params.slug, ...publicVisibility() },
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!post) throw ApiError.notFound('Post not found');
    const related = await BlogPost.find({
      $and: [publicVisibility()],
      _id: { $ne: post._id },
      tags: { $in: post.tags },
    })
      .select('title slug excerpt coverImage readingTime publishedAt')
      .limit(3);

    const [comments, reactions, visitorReaction] = await Promise.all([
      BlogComment.find({ post: post._id })
        .select('post name email content parentComment createdAt updatedAt')
        .sort({ createdAt: 1 }),
      summarizeReactions(String(post._id)),
      visitorKey
        ? BlogReaction.findOne({ post: post._id, visitorKey }).select(
            'reaction'
          )
        : null,
    ]);

    res.json({
      success: true,
      data: post,
      related,
      engagement: {
        comments,
        reactions: reactions.reactions,
        totalComments: comments.length,
        totalReactions: reactions.totalReactions,
        visitorReaction: visitorReaction?.reaction ?? null,
      },
    });
  }
);

/** Public — submit a reaction for a blog post. */
export const reactToPost = asyncHandler(async (req: Request, res: Response) => {
  const { reaction, visitorKey } = req.body as {
    reaction: (typeof BLOG_REACTIONS)[number];
    visitorKey: string;
  };
  const post = await BlogPost.findOne({
    slug: req.params.slug,
    ...publicVisibility(),
  });
  if (!post) throw ApiError.notFound('Post not found');

  const saved = await BlogReaction.findOneAndUpdate(
    { post: post._id, visitorKey },
    { post: post._id, visitorKey, reaction },
    { new: true, upsert: true }
  );
  const summary = await summarizeReactions(String(post._id));

  res.status(200).json({
    success: true,
    data: saved,
    reactions: summary.reactions,
    totalReactions: summary.totalReactions,
    visitorReaction: saved?.reaction ?? null,
  });
});

/** Public — add a comment or reply to a blog post. */
export const commentOnPost = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, email, content, parentCommentId } = req.body as {
      name: string;
      email?: string;
      content: string;
      parentCommentId?: string;
    };
    const post = await BlogPost.findOne({
      slug: req.params.slug,
      ...publicVisibility(),
    });
    if (!post) throw ApiError.notFound('Post not found');

    let parentComment: string | undefined;
    if (parentCommentId) {
      if (!isValidObjectId(parentCommentId)) {
        throw ApiError.badRequest('Parent comment is invalid');
      }
      const parent = await BlogComment.findOne({
        _id: parentCommentId,
        post: post._id,
      });
      if (!parent) throw ApiError.badRequest('Parent comment not found');
      parentComment = String(parent._id);
    }

    const comment = await BlogComment.create({
      post: post._id,
      name,
      email: email?.trim() || '',
      content,
      parentComment,
    });

    res.status(201).json({ success: true, data: comment });
  }
);

/* ----- Admin ----- */
export const listAll = asyncHandler(async (_req: Request, res: Response) => {
  const posts = await BlogPost.find().sort({ createdAt: -1 });
  res.json({ success: true, count: posts.length, data: posts });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const post = await BlogPost.findById(req.params.id);
  if (!post) throw ApiError.notFound('Post not found');
  res.json({ success: true, data: post });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const post = await BlogPost.create(req.body);
  res.status(201).json({ success: true, data: post });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const post = await BlogPost.findById(req.params.id);
  if (!post) throw ApiError.notFound('Post not found');
  post.set(req.body);
  await post.save();
  res.json({ success: true, data: post });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const post = await BlogPost.findById(req.params.id);
  if (!post) throw ApiError.notFound('Post not found');
  if (post.coverPublicId) await destroyAsset(post.coverPublicId);
  await post.deleteOne();
  res.json({ success: true, message: 'Post deleted' });
});
