import mongoose, { type Model } from 'mongoose';
import type { ISeoSettings } from '../types/index.js';

// Singleton SEO defaults backed by config/site fallbacks, using the ESM-safe Mongoose import pattern.
const seoSettingsSchema = new mongoose.Schema<ISeoSettings>(
  {
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    keywords: { type: [String], default: [] },
    ogImage: { type: String, default: '' },
    ogImagePublicId: { type: String, default: '' },
    twitterHandle: { type: String, default: '' },
    siteName: { type: String, default: '' },
    authorName: { type: String, default: '' },
    siteUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

export const SeoSettings =
  (mongoose.models.SeoSettings as Model<ISeoSettings>) ||
  mongoose.model<ISeoSettings>('SeoSettings', seoSettingsSchema);
export default SeoSettings;
