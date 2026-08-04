import mongoose, { type Model } from 'mongoose';
import type { IBlogComment } from '../types/index.js';

const blogCommentSchema = new mongoose.Schema<IBlogComment>(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BlogPost',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    content: { type: String, required: true, trim: true },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BlogComment',
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

blogCommentSchema.index({ post: 1, parentComment: 1, createdAt: 1 });

export const BlogComment =
  (mongoose.models.BlogComment as Model<IBlogComment>) ||
  mongoose.model<IBlogComment>('BlogComment', blogCommentSchema);
export default BlogComment;
