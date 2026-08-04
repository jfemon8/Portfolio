import mongoose, { type Model } from 'mongoose';
import type { IBlogReaction } from '../types/index.js';

const blogReactionSchema = new mongoose.Schema<IBlogReaction>(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BlogPost',
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

blogReactionSchema.index({ post: 1, visitorKey: 1 }, { unique: true });
blogReactionSchema.index({ post: 1, reaction: 1 });

export const BlogReaction =
  (mongoose.models.BlogReaction as Model<IBlogReaction>) ||
  mongoose.model<IBlogReaction>('BlogReaction', blogReactionSchema);
export default BlogReaction;
