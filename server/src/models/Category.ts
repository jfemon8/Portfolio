import mongoose, { type Model } from 'mongoose';
import type { ICategory } from '../types/index.js';

const categorySchema = new mongoose.Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    /** Stable slug used as ISkill.category. Lower-kebab, unique. */
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

categorySchema.index({ order: 1 });

export const Category =
  (mongoose.models.Category as Model<ICategory>) ||
  mongoose.model<ICategory>('Category', categorySchema);
export default Category;
