import mongoose, { type Model } from 'mongoose';
import slugify from 'slugify';
import type { IProject } from '../types/index.js';

const caseStudySchema = new mongoose.Schema(
  {
    problem: { type: String, default: '' },
    process: { type: String, default: '' },
    architecture: { type: String, default: '' },
    database: { type: String, default: '' },
    api: { type: String, default: '' },
    challenges: { type: String, default: '' },
    solutions: { type: String, default: '' },
    optimization: { type: String, default: '' },
    learnings: { type: String, default: '' },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema<IProject>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    tagline: { type: String, default: '' },
    description: { type: String, default: '' },
    caseStudy: { type: caseStudySchema, default: () => ({}) },
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
    videoUrl: { type: String, default: '' },
    metrics: {
      type: [{ label: String, value: String }],
      default: [],
    },
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
