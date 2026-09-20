import mongoose, { type Model } from 'mongoose';
import type { ISiteSettings } from '../types/index.js';

// Singleton homepage layout storing only order, visibility and hero-image overrides, using the ESM-safe Mongoose import pattern.
const siteSettingsSchema = new mongoose.Schema<ISiteSettings>(
  {
    heroBackground: { type: String, default: '' },
    sections: {
      type: [{ key: String, visible: Boolean }],
      default: [],
    },
  },
  { timestamps: true }
);

export const SiteSettings =
  (mongoose.models.SiteSettings as Model<ISiteSettings>) ||
  mongoose.model<ISiteSettings>('SiteSettings', siteSettingsSchema);
export default SiteSettings;
