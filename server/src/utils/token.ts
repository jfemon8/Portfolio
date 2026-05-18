import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { authConfig } from '../config/auth.js';
import type { JwtPayload } from '../types/index.js';

/* ----------------------------- Access token ----------------------------- */

export const signAccessToken = (payload: Omit<JwtPayload, 'type'>): string =>
  jwt.sign({ ...payload, type: 'access' }, env.jwtSecret, {
    expiresIn: authConfig.accessTtl as SignOptions['expiresIn'],
  });

export const verifyAccessToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
  if (decoded.type !== 'access') throw new Error('Invalid token type');
  return decoded;
};

/** Back-compat aliases (existing imports keep working — rule 8). */
export const signToken = signAccessToken;
export const verifyToken = verifyAccessToken;

/* ----------------------------- Refresh token ----------------------------- */

/** Opaque, high-entropy refresh token (raw → client cookie, hash → DB). */
export const generateRefreshToken = (): string =>
  crypto.randomBytes(48).toString('base64url');

export const hashRefreshToken = (raw: string): string =>
  crypto.createHash('sha256').update(raw).digest('hex');

export const newTokenFamily = (): string => crypto.randomUUID();
