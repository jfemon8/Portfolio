import mongoose, { type Model } from 'mongoose';
import type { IEducation } from '../types/index.js';

const educationSchema = new mongoose.Schema<IEducation>(
  {
    institution: { type: String, required: true },
    degree: { type: String, required: true },
    field: { type: String, default: '' },
    location: { type: String, default: '' },
    startYear: { type: String, default: '' },
    endYear: { type: String, default: '' },
    grade: { type: String, default: '' },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

educationSchema.index({ order: 1 });

export const Education =
  (mongoose.models.Education as Model<IEducation>) ||
  mongoose.model<IEducation>('Education', educationSchema);
export default Education;
