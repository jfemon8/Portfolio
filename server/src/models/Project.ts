import mongoose, { type Model } from 'mongoose';
import slugify from 'slugify';
import type { IProject } from '../types/index.js';

const projectSchema = new mongoose.Schema<IProject>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    tagline: { type: String, default: '' },
    description: { type: String, default: '' },
    summary: { type: String, default: '' },
    techStack: { type: [String], default: [] },
    highlights: { type: [String], default: [] },
    category: {
      type: String,
      enum: ['fullstack', 'frontend', 'backend', 'mobile', 'other'],
      default: 'fullstack',
    },
    coverImage: { type: String, default: '' },
    coverPublicId: { type: String, default: '' },
    gallery: {
      type: [{ url: String, publicId: String, caption: String }],
      default: [],
    },
    sourceUrl: { type: String, default: '' },
    liveUrl: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['completed', 'in-progress', 'archived'],
      default: 'completed',
    },
    year: { type: String, default: '' },
    order: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

projectSchema.pre('validate', function setSlug(next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

projectSchema.index({ featured: -1, order: 1, createdAt: -1 });

export const Project =
  (mongoose.models.Project as Model<IProject>) ||
  mongoose.model<IProject>('Project', projectSchema);
export default Project;
