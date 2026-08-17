import mongoose, { type Model } from 'mongoose';
import type { IJobTracker } from '../types/index.js';

const entrySchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true },
    applied: Boolean,
    appliedAt: Date,
    saved: Boolean,
    savedAt: Date,
    hidden: Boolean,
    hiddenAt: Date,
    note: { type: String, maxlength: 2000 },
    updatedAt: { type: Date, required: true },
  },
  { _id: false }
);

const jobTrackerSchema = new mongoose.Schema<IJobTracker>(
  {
    deviceId: { type: String, required: true, unique: true },
    entries: { type: [entrySchema], default: [] },
  },
  { timestamps: true }
);

export const JobTracker =
  (mongoose.models.JobTracker as Model<IJobTracker>) ||
  mongoose.model<IJobTracker>('JobTracker', jobTrackerSchema);
export default JobTracker;
