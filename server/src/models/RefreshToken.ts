import mongoose, { type Model } from 'mongoose';
import type { IRefreshToken } from '../types/index.js';

/**
 * One row per issued refresh token (stored HASHED, never raw).
 * Rotation: each /auth/refresh revokes the presented token and issues a new
 * one in the same `family`. If a revoked token is presented again
 * (reuse/theft) the whole family is revoked — see authService.
 */
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
