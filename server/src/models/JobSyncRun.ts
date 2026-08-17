import mongoose, { type Model } from 'mongoose';
import type { IJobSyncRun } from '../types/index.js';

const jobSyncRunSchema = new mongoose.Schema<IJobSyncRun>({
  trigger: { type: String, enum: ['automatic', 'manual'], required: true },
  finishedAt: { type: Date, required: true },
  durationMs: { type: Number, default: 0 },
  feeds: { type: Number, default: 0 },
  scanned: { type: Number, default: 0 },
  unique: { type: Number, default: 0 },
  duplicatesMerged: { type: Number, default: 0 },
  added: { type: Number, default: 0 },
  updated: { type: Number, default: 0 },
  expiredRemoved: { type: Number, default: 0 },
  purged: { type: Number, default: 0 },
  failures: { type: [String], default: [] },
  warnings: { type: [String], default: [] },
  scopedDb: { type: Boolean, default: false },
});

jobSyncRunSchema.index({ finishedAt: -1 });

export const JobSyncRun =
  (mongoose.models.JobSyncRun as Model<IJobSyncRun>) ||
  mongoose.model<IJobSyncRun>('JobSyncRun', jobSyncRunSchema);
export default JobSyncRun;
