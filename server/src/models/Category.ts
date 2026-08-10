import mongoose, { type Model } from 'mongoose';
import type { ICategory } from '../types/index.js';

const categorySchema = new mongoose.Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    /** Stable slug used as ISkill.category (scope 'skill') or ITool.category (scope 'tool'). Lower-kebab, unique within its scope. */
    slug: { type: String, required: true, trim: true, lowercase: true },
    /** Which resource's category picker this entry belongs to — keeps skill and tool categories from sharing one flat, mismatched namespace. */
    scope: { type: String, enum: ['skill', 'tool'], default: 'skill' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

categorySchema.index({ slug: 1, scope: 1 }, { unique: true });
categorySchema.index({ scope: 1, order: 1 });

export const Category =
  (mongoose.models.Category as Model<ICategory>) ||
  mongoose.model<ICategory>('Category', categorySchema);
export default Category;
