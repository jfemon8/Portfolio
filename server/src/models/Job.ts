import mongoose, { type Model } from 'mongoose';
import type { IJob, JobAttachment } from '../types/index.js';

// A dedicated sub-schema: an inline one whose own field is named `type` is read as a type declaration.
const attachmentSchema = new mongoose.Schema<JobAttachment>(
  {
    url: { type: String, trim: true, maxlength: 2048 },
    type: { type: String, enum: ['image', 'pdf'], default: 'image' },
    label: { type: String, trim: true, maxlength: 160, default: '' },
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema<IJob>(
  {
    title: { type: String, required: true, trim: true, maxlength: 240 },
    company: { type: String, required: true, trim: true, maxlength: 160 },
    location: {
      type: String,
      default: 'Bangladesh',
      trim: true,
      maxlength: 160,
    },
    category: {
      type: String,
      enum: ['government', 'private', 'it', 'bank', 'ngo', 'other'],
      default: 'other',
      index: true,
    },
    description: { type: String, default: '', maxlength: 30000 },
    applyUrl: { type: String, default: '', trim: true, maxlength: 2048 },
    sourceUrl: { type: String, default: '', trim: true, maxlength: 2048 },
    sourceName: { type: String, default: 'Manual', trim: true, maxlength: 120 },
    sourceKey: { type: String, default: 'manual', trim: true, maxlength: 80 },
    externalId: { type: String, trim: true, maxlength: 300 },
    source: { type: String, enum: ['manual', 'automated'], default: 'manual' },
    employmentType: { type: String, default: '', trim: true, maxlength: 80 },
    salary: { type: String, default: '', trim: true, maxlength: 120 },
    publishedAt: { type: Date },
    // YYYY-MM-DD in Asia/Dhaka: avoids an accidental UTC conversion moving an expiry date.
    deadline: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    deadlineAssumed: { type: Boolean, default: false },
    lastSeenAt: { type: Date },
    dedupeKey: { type: String, trim: true, maxlength: 400 },
    sources: {
      type: [
        {
          _id: false,
          key: { type: String, trim: true, maxlength: 80 },
          name: { type: String, trim: true, maxlength: 120 },
          url: { type: String, trim: true, maxlength: 2048 },
        },
      ],
      default: [],
    },
    quality: { type: Number, default: 0, min: 0 },
    region: {
      type: String,
      enum: ['bangladesh', 'remote', 'international'],
      default: 'bangladesh',
      index: true,
    },
    // Government circulars are usually a scanned page rather than text.
    attachments: { type: [attachmentSchema], default: [] },
  },
  { timestamps: true }
);

jobSchema.index({ category: 1, deadline: 1, publishedAt: -1 });
// Newest-first is the default public ordering; the purge sweeps automated rows by staleness.
jobSchema.index({ publishedAt: -1 });
jobSchema.index({ source: 1, lastSeenAt: 1 });
// The agent upserts on the cross-source fingerprint, so one vacancy is never stored twice.
jobSchema.index(
  { dedupeKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      source: 'automated',
      dedupeKey: { $type: 'string' },
    },
  }
);
// Expired postings are swept by deadline, so it needs to stand alone as well.
jobSchema.index({ deadline: 1 });

export const Job =
  (mongoose.models.Job as Model<IJob>) ||
  mongoose.model<IJob>('Job', jobSchema);
export default Job;
