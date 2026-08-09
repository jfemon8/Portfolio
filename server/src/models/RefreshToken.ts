import mongoose, { type Model } from 'mongoose';
import type { IRefreshToken } from '../types/index.js';

// Refresh tokens stored hashed; each rotation revokes the presented token and reissues in the same family — replaying a revoked token revokes the whole family (see authService).
const refreshTokenSchema = new mongoose.Schema<IRefreshToken>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true, index: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    replacedByHash: { type: String },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

// TTL: Mongo auto-purges expired tokens.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken =
  (mongoose.models.RefreshToken as Model<IRefreshToken>) ||
  mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema);
export default RefreshToken;
