import mongoose, { type Model } from 'mongoose';
import type { IExperience } from '../types/index.js';

const experienceSchema = new mongoose.Schema<IExperience>(
  {
    role: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String, default: '' },
    startDate: { type: String, required: true },
    endDate: { type: String, default: 'Present' },
    current: { type: Boolean, default: false },
    type: {
      type: String,
      enum: ['full-time', 'part-time', 'internship', 'contract', 'freelance'],
      default: 'full-time',
    },
    highlights: { type: [String], default: [] },
    tech: { type: [String], default: [] },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

experienceSchema.index({ order: 1, createdAt: -1 });

export const Experience =
  (mongoose.models.Experience as Model<IExperience>) ||
  mongoose.model<IExperience>('Experience', experienceSchema);
export default Experience;
