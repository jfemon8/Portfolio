import mongoose, { type Model } from 'mongoose';
import type { IJobSourceHealth } from '../types/index.js';

const jobSourceHealthSchema = new mongoose.Schema<IJobSourceHealth>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 80,
    },
    name: { type: String, default: '', trim: true, maxlength: 120 },
    kind: { type: String, enum: ['feed', 'crawler'], default: 'feed' },
    lastRunAt: { type: Date },
    lastOkAt: { type: Date },
    lastError: { type: String, default: '', maxlength: 500 },
    consecutiveFailures: { type: Number, default: 0, min: 0 },
    /** Runs in a row that succeeded but returned nothing — a silent-breakage signal. */
    consecutiveEmpty: { type: Number, default: 0, min: 0 },
    lastScanned: { type: Number, default: 0, min: 0 },
    lastAdded: { type: Number, default: 0, min: 0 },
    totalRuns: { type: Number, default: 0, min: 0 },
    totalFailures: { type: Number, default: 0, min: 0 },
    lastDurationMs: { type: Number, default: 0, min: 0 },
    /** Set when repeated failures take a source out of rotation until it is retried. */
    disabledUntil: { type: Date },
  },
  { timestamps: true }
);

export const JobSourceHealth =
  (mongoose.models.JobSourceHealth as Model<IJobSourceHealth>) ||
  mongoose.model<IJobSourceHealth>('JobSourceHealth', jobSourceHealthSchema);
export default JobSourceHealth;
