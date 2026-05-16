import mongoose, { type Model } from 'mongoose';
import slugify from 'slugify';
import type { IBlogPost } from '../types/index.js';

const blogSchema = new mongoose.Schema<IBlogPost>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    excerpt: { type: String, default: '' },
    content: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    coverPublicId: { type: String, default: '' },
    tags: { type: [String], default: [] },
    category: { type: String, default: 'General' },
    readingTime: { type: Number, default: 1 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    featured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

blogSchema.pre('validate', function prep(next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  if (this.isModified('content')) {
    const words = (this.content || '').trim().split(/\s+/).length;
    this.readingTime = Math.max(1, Math.round(words / 200));
  }
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

blogSchema.index({ status: 1, publishedAt: -1 });

export const BlogPost =
  (mongoose.models.BlogPost as Model<IBlogPost>) ||
  mongoose.model<IBlogPost>('BlogPost', blogSchema);
export default BlogPost;
