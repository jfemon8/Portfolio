import mongoose, { type Model } from 'mongoose';
import type { IBlogCommentReaction } from '../types/index.js';

const blogCommentReactionSchema = new mongoose.Schema<IBlogCommentReaction>(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BlogPost',
      required: true,
      index: true,
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BlogComment',
      required: true,
      index: true,
    },
    visitorKey: { type: String, required: true, trim: true },
    reaction: {
      type: String,
      enum: ['like', 'love', 'clap', 'insightful', 'fire'],
      required: true,
    },
  },
  { timestamps: true }
);

blogCommentReactionSchema.index(
  { comment: 1, visitorKey: 1 },
  { unique: true }
);
blogCommentReactionSchema.index({ post: 1, comment: 1, reaction: 1 });

export const BlogCommentReaction =
  (mongoose.models.BlogCommentReaction as Model<IBlogCommentReaction>) ||
  mongoose.model<IBlogCommentReaction>(
    'BlogCommentReaction',
    blogCommentReactionSchema
  );
export default BlogCommentReaction;
