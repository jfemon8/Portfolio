import mongoose, { type Model } from 'mongoose';
import type { ISiteSettings } from '../types/index.js';

// Singleton homepage layout; canonical section catalogue lives on the client, this only stores order/visibility overrides + hero image. Mongoose ESM-safe pattern, don't regress to named imports.
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
