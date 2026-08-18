import mongoose, { type Model } from 'mongoose';
import { toSlug } from '../utils/slug.js';
import type { ITool } from '../types/index.js';

const toolSchema = new mongoose.Schema<ITool>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'Developer Utilities', trim: true },
    icon: {
      type: String,
      enum: [
        'KeyRound',
        'Braces',
        'Regex',
        'GitCompare',
        'TrendingUp',
        'Wrench',
        'Terminal',
        'Sparkles',
        'Gauge',
        'Lock',
        'FileSearch',
        'FileStack',
        'Mic2',
        'MailCheck',
        'ScanText',
      ],
      default: 'Wrench',
    },
    key: {
      type: String,
      required: true,
      enum: [
        'jwt-decoder',
        'json-formatter',
        'regex-tester',
        'cp-profile-comparer',
        'cf-rating-predictor',
        'bigo-benchmark',
        'password-crack-time',
        'resume-ats-xray',
        'pdf-power-tools',
        'music-remover',
        'email-verifier',
        'image-to-text',
      ],
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

toolSchema.pre('validate', function setSlug(next) {
  // Guard on a present name so a missing one falls through to the required validator (400) instead of throwing inside slugify (500).
  if (this.name && (this.isModified('name') || !this.slug)) {
    this.slug = toSlug(this.name, String(this._id));
  }
  next();
});

export const Tool =
  (mongoose.models.Tool as Model<ITool>) ||
  mongoose.model<ITool>('Tool', toolSchema);
export default Tool;
