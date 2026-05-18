import mongoose, { type Model } from 'mongoose';
import type { ICpStats } from '../types/index.js';

/**
 * Server-side cache of a competitive-programming snapshot. Codeforces
 * rate-limits (and Vercel is serverless/stateless), so the controller
 * serves this doc and only refetches when it goes stale — one doc per
 * handle. Mongoose ESM-safe pattern (do NOT regress to named imports).
 */
const cpStatsSchema = new mongoose.Schema<ICpStats>(
  {
    handle: { type: String, required: true, unique: true, index: true },
    rating: { type: Number, default: null },
    maxRating: { type: Number, default: null },
    rank: { type: String, default: '' },
    maxRank: { type: String, default: '' },
    contests: { type: Number, default: 0 },
    fetchedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

export const CpStats =
  (mongoose.models.CpStats as Model<ICpStats>) ||
  mongoose.model<ICpStats>('CpStats', cpStatsSchema);
export default CpStats;
