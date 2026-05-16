import mongoose, { type Model } from 'mongoose';
import type { IVisit } from '../types/index.js';

/**
 * Lightweight, privacy-friendly analytics event — no cookies, no personal
 * identifiers; just a path, event type and a day bucket.
 */
const visitSchema = new mongoose.Schema<IVisit>(
  {
    type: {
      type: String,
      enum: [
        'pageview',
        'project_click',
        'resume_download',
        'contact_submit',
        'social_click',
      ],
      default: 'pageview',
    },
    path: { type: String, default: '/' },
    ref: { type: String, default: '' },
    referrer: { type: String, default: 'direct' },
    device: { type: String, default: 'unknown' },
    country: { type: String, default: '' },
    day: { type: String, index: true },
  },
  { timestamps: true }
);

visitSchema.pre('validate', function bucket(next) {
  if (!this.day) this.day = new Date().toISOString().slice(0, 10);
  next();
});

visitSchema.index({ type: 1, createdAt: -1 });

export const Visit =
  (mongoose.models.Visit as Model<IVisit>) ||
  mongoose.model<IVisit>('Visit', visitSchema);
export default Visit;
