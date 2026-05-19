import mongoose, { type Model } from 'mongoose';
import type { ISiteSettings } from '../types/index.js';

/**
 * Admin-managed homepage layout (singleton, like Profile/SeoSettings). The
 * canonical section catalogue lives on the client (single source); this only
 * stores the owner's order/visibility overrides + an optional hero image.
 * Mongoose ESM-safe pattern (do NOT regress to named runtime imports).
 */
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
