import mongoose, { type Model } from 'mongoose';
import type { ICpStats } from '../types/index.js';

// Cached CP snapshot (one doc per handle); Codeforces rate-limits and Vercel is stateless, so refetch only when stale. Mongoose ESM-safe pattern, don't regress to named imports.
const leetcodeSchema = new mongoose.Schema(
  {
    handle: String,
    totalSolved: Number,
    easy: Number,
    medium: Number,
    hard: Number,
    ranking: Number,
    calendar: { type: [{ date: String, count: Number }], default: [] },
  },
  { _id: false }
);

const codechefSchema = new mongoose.Schema(
  {
    handle: String,
    rating: Number,
    highestRating: Number,
    stars: Number,
  },
  { _id: false }
);

const cpStatsSchema = new mongoose.Schema<ICpStats>(
  {
    handle: { type: String, required: true, unique: true, index: true },
    rating: { type: Number, default: null },
    maxRating: { type: Number, default: null },
    rank: { type: String, default: '' },
    maxRank: { type: String, default: '' },
    contests: { type: Number, default: 0 },
    leetcode: { type: leetcodeSchema, default: null },
    codechef: { type: codechefSchema, default: null },
    ratingHistory: {
      type: [{ contest: String, rating: Number, date: String }],
      default: [],
    },
    fetchedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

export const CpStats =
  (mongoose.models.CpStats as Model<ICpStats>) ||
  mongoose.model<ICpStats>('CpStats', cpStatsSchema);
export default CpStats;
