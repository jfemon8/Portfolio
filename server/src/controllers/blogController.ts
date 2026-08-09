import type { Request, Response } from 'express';
import { isValidObjectId, Types, type RootFilterQuery } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { BlogPost } from '../models/BlogPost.js';
import { BlogComment } from '../models/BlogComment.js';
import { BlogCommentReaction } from '../models/BlogCommentReaction.js';
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

type CommentReactionSummary = {
  reactions: { _id: (typeof BLOG_REACTIONS)[number]; count: number }[];
  totalReactions: number;
  visitorReaction: (typeof BLOG_REACTIONS)[number] | null;
};

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

const summarizeCommentReactions = async (
  postId: string,
  commentIds: string[],
  visitorKey: string
) => {
  if (!commentIds.length) return new Map<string, CommentReactionSummary>();

  const objectIds = commentIds.map((id) => new Types.ObjectId(id));
  const [reactions, visitorReactions] = await Promise.all([
    BlogCommentReaction.aggregate<{
      _id: { comment: string; reaction: (typeof BLOG_REACTIONS)[number] };
      count: number;
    }>([
      {
        $match: {
          post: new Types.ObjectId(postId),
          comment: { $in: objectIds },
        },
      },
      {
        $group: {
          _id: { comment: '$comment', reaction: '$reaction' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.comment': 1, '_id.reaction': 1 } },
    ]),
    visitorKey
      ? BlogCommentReaction.find({
          post: new Types.ObjectId(postId),
          comment: { $in: objectIds },
          visitorKey,
        })
          .select('comment reaction')
          .lean()
      : Promise.resolve([] as { comment: Types.ObjectId; reaction: string }[]),
  ]);

  const map = new Map<string, CommentReactionSummary>();

  for (const commentId of commentIds) {
    map.set(commentId, {
      reactions: [],
      totalReactions: 0,
      visitorReaction: null,
    });
  }

  for (const item of reactions) {
    const commentId = String(item._id.comment);
    const entry = map.get(commentId);
    if (!entry) continue;
    entry.reactions.push({ _id: item._id.reaction, count: item.count });
    entry.totalReactions += item.count;
  }

  for (const item of visitorReactions) {
    const commentId = String(item.comment);
    const entry = map.get(commentId);
    if (!entry) continue;
    entry.visitorReaction = item.reaction as (typeof BLOG_REACTIONS)[number];
  }

  return map;
};

/** A post is public if published, or scheduled with its time due — the model only auto-promotes on save, and this query covers the rest since Vercel serverless has no cron. */
export const publicVisibility = (): RootFilterQuery<IBlogPost> => ({
  $or: [
    { status: 'published' },
    { status: 'scheduled', scheduledFor: { $lte: new Date() } },
  ],
});

/** Escape regex metacharacters so a search term is matched literally — prevents invalid-regex 500s (e.g. "C++") and closes the regex-injection / ReDoS surface on this public endpoint. */
const escapeRegex = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Public — visible posts only, paginated, with ?tag & ?q search. */
export const listPublished = asyncHandler(
  async (req: Request, res: Response) => {
    // Self-heal: promote due scheduled posts here since Vercel serverless has no cron and the model otherwise only promotes on .save().
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
        .limit(limit)
        .lean(),
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

    const [related, comments, reactions, visitorReaction] = await Promise.all([
      BlogPost.find({
        $and: [publicVisibility()],
        _id: { $ne: post._id },
        tags: { $in: post.tags },
      })
        .select('title slug excerpt coverImage readingTime publishedAt')
        .limit(3)
        .lean(),
      BlogComment.find({ post: post._id })
        .select('post name email content parentComment createdAt updatedAt')
        .sort({ createdAt: 1 })
        .lean(),
      summarizeReactions(String(post._id)),
      visitorKey
        ? BlogReaction.findOne({ post: post._id, visitorKey }).select(
            'reaction'
          )
        : null,
    ]);

    const commentIds = comments.map((comment) => String(comment._id));
    const commentReactionSummary = await summarizeCommentReactions(
      String(post._id),
      commentIds,
      visitorKey
    );
    const enrichedComments = comments.map((comment) => {
      const summary = commentReactionSummary.get(String(comment._id));
      return {
        ...comment,
        reactions: summary?.reactions ?? [],
        totalReactions: summary?.totalReactions ?? 0,
        visitorReaction: summary?.visitorReaction ?? null,
      };
    });

    res.json({
      success: true,
      data: post,
      related,
      engagement: {
        comments: enrichedComments,
        reactions: reactions.reactions,
        totalComments: enrichedComments.length,
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

/** Public — react to a specific blog comment. */
export const reactToComment = asyncHandler(
  async (req: Request, res: Response) => {
    const { reaction, visitorKey } = req.body as {
      reaction: (typeof BLOG_REACTIONS)[number];
      visitorKey: string;
    };
    const post = await BlogPost.findOne({
      slug: req.params.slug,
      ...publicVisibility(),
    });
    if (!post) throw ApiError.notFound('Post not found');

    const comment = await BlogComment.findOne({
      _id: req.params.commentId,
      post: post._id,
    });
    if (!comment) throw ApiError.notFound('Comment not found');

    const saved = await BlogCommentReaction.findOneAndUpdate(
      {
        post: post._id,
        comment: comment._id,
        visitorKey,
      },
      {
        post: post._id,
        comment: comment._id,
        visitorKey,
        reaction,
      },
      { new: true, upsert: true }
    );

    const summary = await summarizeCommentReactions(
      String(post._id),
      [String(comment._id)],
      visitorKey
    );
    const item = summary.get(String(comment._id));

    res.status(200).json({
      success: true,
      data: saved,
      reactions: item?.reactions ?? [],
      totalReactions: item?.totalReactions ?? 0,
      visitorReaction: item?.visitorReaction ?? null,
    });
  }
);

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

/** Admin — update any blog comment or reply. */
export const updateComment = asyncHandler(
  async (req: Request, res: Response) => {
    const comment = await BlogComment.findById(req.params.id);
    if (!comment) throw ApiError.notFound('Comment not found');

    const { name, email, content } = req.body as {
      name?: string;
      email?: string;
      content?: string;
    };

    if (typeof name === 'string') comment.name = name.trim();
    if (typeof email === 'string') comment.email = email.trim();
    if (typeof content === 'string') comment.content = content.trim();

    await comment.save();
    res.json({ success: true, data: comment });
  }
);

/** Admin — delete a blog comment/reply and all nested descendants. */
export const removeComment = asyncHandler(
  async (req: Request, res: Response) => {
    const comment = await BlogComment.findById(req.params.id);
    if (!comment) throw ApiError.notFound('Comment not found');

    const descendants = await BlogComment.find({ post: comment.post })
      .select('_id parentComment')
      .lean();
    const ids = new Set<string>([String(comment._id)]);

    let changed = true;
    while (changed) {
      changed = false;
      for (const item of descendants) {
        const parentId = item.parentComment ? String(item.parentComment) : null;
        if (parentId && ids.has(parentId)) {
          const childId = String(item._id);
          if (!ids.has(childId)) {
            ids.add(childId);
            changed = true;
          }
        }
      }
    }

    const objectIds = [...ids].map((id) => new Types.ObjectId(id));
    await Promise.all([
      BlogCommentReaction.deleteMany({ comment: { $in: objectIds } }),
      BlogComment.deleteMany({ _id: { $in: objectIds } }),
    ]);

    res.json({ success: true, message: 'Comment deleted' });
  }
);

/* ----- Admin ----- */
export const listAll = asyncHandler(async (_req: Request, res: Response) => {
  const posts = await BlogPost.find().sort({ createdAt: -1 }).lean();
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
