import mongoose, { type Model } from 'mongoose';
import type { ISkill } from '../types/index.js';

const skillSchema = new mongoose.Schema<ISkill>(
  {
    name: { type: String, required: true },
    // Category is now a slug ref into the Category collection — no enum so
    // admins can manage the list at runtime via /admin/skills (Categories
    // tab). Legacy values ('language', 'framework', …) match the seeded
    // defaults, so existing rows continue to group correctly.
    category: { type: String, default: 'other', trim: true, lowercase: true },
    level: { type: Number, min: 0, max: 100, default: 75 },
    /** Legacy free-text icon hint (name or URL). Retained for backward
     *  compat with previously-saved values. New entries use iconImage. */
    icon: { type: String, default: '' },
    /** Uploaded Cloudinary icon image; empty → public side renders a
     *  react-icons logo matched by skill name. */
    iconImage: { type: String, default: '' },
    iconImagePublicId: { type: String, default: '' },
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
