import mongoose, { type Model } from 'mongoose';
import type { ICertification } from '../types/index.js';

const certificationSchema = new mongoose.Schema<ICertification>(
  {
    title: { type: String, required: true },
    issuer: { type: String, default: '' },
    issueDate: { type: String, default: '' },
    credentialUrl: { type: String, default: '' },
    mediaUrl: { type: String, default: '' },
    mediaPublicId: { type: String, default: '' },
    category: {
      type: String,
      enum: ['certification', 'publication', 'achievement'],
      default: 'certification',
    },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

certificationSchema.index({ category: 1, order: 1 });

export const Certification =
  (mongoose.models.Certification as Model<ICertification>) ||
  mongoose.model<ICertification>('Certification', certificationSchema);
export default Certification;
