import mongoose, { type Model } from 'mongoose';
import type { ISkill } from '../types/index.js';

const skillSchema = new mongoose.Schema<ISkill>(
  {
    name: { type: String, required: true },
    // No enum: category is a slug ref admins manage at runtime via /admin/skills; legacy values still match the seeded defaults.
    category: { type: String, default: 'other', trim: true, lowercase: true },
    level: { type: Number, min: 0, max: 100, default: 75 },
    /** Legacy free-text icon hint, retained for backward compat; new entries use iconImage. */
    icon: { type: String, default: '' },
    /** Uploaded Cloudinary icon image; empty falls back to a react-icons logo matched by skill name. */
    iconImage: { type: String, default: '' },
    iconImagePublicId: { type: String, default: '' },
    order: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

skillSchema.index({ category: 1, order: 1 });
skillSchema.index({ order: 1, level: -1 });

export const Skill =
  (mongoose.models.Skill as Model<ISkill>) ||
  mongoose.model<ISkill>('Skill', skillSchema);
export default Skill;
