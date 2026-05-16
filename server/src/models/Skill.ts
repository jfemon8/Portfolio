import mongoose, { type Model } from 'mongoose';
import type { ISkill } from '../types/index.js';

const skillSchema = new mongoose.Schema<ISkill>(
  {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['language', 'framework', 'database', 'tool', 'cloud', 'concept', 'other'],
      default: 'other',
    },
    level: { type: Number, min: 0, max: 100, default: 75 },
    icon: { type: String, default: '' },
    order: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

skillSchema.index({ category: 1, order: 1 });

export const Skill =
  (mongoose.models.Skill as Model<ISkill>) ||
  mongoose.model<ISkill>('Skill', skillSchema);
export default Skill;
