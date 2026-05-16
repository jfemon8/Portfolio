import type { Request, Response } from 'express';
import type { RootFilterQuery } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { BlogPost } from '../models/BlogPost.js';
import type { IBlogPost } from '../types/index.js';
import { destroyAsset } from '../config/cloudinary.js';

/** Public — published posts only, paginated, with ?tag & ?q search. */
export const listPublished = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page)) || 1);
    const limit = Math.min(50, parseInt(String(req.query.limit)) || 9);
    const filter: RootFilterQuery<IBlogPost> = { status: 'published' };
    if (req.query.tag) filter.tags = String(req.query.tag);
    if (req.query.q) {
      const q = String(req.query.q);
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { excerpt: { $regex: q, $options: 'i' } },
      ];
    }

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
    const post = await BlogPost.findOneAndUpdate(
      { slug: req.params.slug, status: 'published' },
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!post) throw ApiError.notFound('Post not found');
    const related = await BlogPost.find({
      status: 'published',
      _id: { $ne: post._id },
      tags: { $in: post.tags },
    })
      .select('title slug excerpt coverImage readingTime publishedAt')
      .limit(3);
    res.json({ success: true, data: post, related });
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
