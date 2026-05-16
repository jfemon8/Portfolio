import mongoose, { type Model } from 'mongoose';
import type { IPublication } from '../types/index.js';

const publicationSchema = new mongoose.Schema<IPublication>(
  {
    title: { type: String, required: true },
    venue: { type: String, default: '' },
    authors: { type: String, default: '' },
    year: { type: String, default: '' },
    url: { type: String, default: '' },
    abstract: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

publicationSchema.index({ order: 1, createdAt: -1 });

export const Publication =
  (mongoose.models.Publication as Model<IPublication>) ||
  mongoose.model<IPublication>('Publication', publicationSchema);
export default Publication;
