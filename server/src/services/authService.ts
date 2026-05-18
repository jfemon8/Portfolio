import type { Request } from 'express';
import { User, type UserDoc } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { ApiError } from '../utils/ApiError.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  newTokenFamily,
} from '../utils/token.js';
import { refreshExpiryDate } from '../config/auth.js';
import { recordAudit, clientInfo } from './auditService.js';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserDoc['role'];
  status: UserDoc['status'];
  isImmutableSuperAdmin: boolean;
  avatar: string;
  lastLogin?: Date;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  /** raw refresh token — controller puts this in the HttpOnly cookie */
  refreshToken: string;
}

export const toPublicUser = (u: UserDoc): PublicUser => ({
  id: u._id.toString(),
  name: u.name,
  email: u.email,
  role: u.role,
  status: u.status,
  isImmutableSuperAdmin: u.isImmutableSuperAdmin,
  avatar: u.avatar,
  lastLogin: u.lastLogin,
});

async function issueTokens(
  user: UserDoc,
  req: Request,
  family: string
): Promise<AuthResult> {
  const accessToken = signAccessToken({
    id: user._id.toString(),
    role: user.role,
    email: user.email,
  });
  const raw = generateRefreshToken();
  const { ip, userAgent } = clientInfo(req);
  await RefreshToken.create({
    user: user._id,
    tokenHash: hashRefreshToken(raw),
    family,
    expiresAt: refreshExpiryDate(),
    ip,
    userAgent,
  });
  return { user: toPublicUser(user), accessToken, refreshToken: raw };
}

export async function login(
  email: string,
  password: string,
  req: Request
): Promise<AuthResult> {
  const user = await User.findOne({
    email: String(email).toLowerCase(),
  }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    recordAudit({
      req,
      action: 'auth.login_failed',
      actorEmail: String(email).toLowerCase(),
      meta: { reason: 'bad_credentials' },
    });
    throw ApiError.unauthorized('Incorrect email or password.');
  }
  if (user.status === 'disabled') {
    recordAudit({
      req,
      action: 'auth.login_failed',
      actor: user._id,
      actorEmail: user.email,
      role: user.role,
      meta: { reason: 'disabled' },
    });
    throw ApiError.forbidden('This account has been disabled.');
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const result = await issueTokens(user, req, newTokenFamily());
  recordAudit({
    req,
    action: 'auth.login',
    actor: user._id,
    actorEmail: user.email,
    role: user.role,
  });
  return result;
}

export async function rotateRefresh(
  rawToken: string | undefined,
  req: Request
): Promise<AuthResult> {
  if (!rawToken) throw ApiError.unauthorized('Missing refresh token.');

  const tokenHash = hashRefreshToken(rawToken);
  const existing = await RefreshToken.findOne({ tokenHash });

  if (!existing) {
    recordAudit({
      req,
      action: 'auth.refresh_reuse_detected',
      meta: { reason: 'unknown_token' },
    });
    throw ApiError.unauthorized('Invalid session. Please log in again.');
  }

  // Reuse / theft: a revoked token presented again → nuke the whole family.
  if (existing.revokedAt) {
    await RefreshToken.updateMany(
      { family: existing.family, revokedAt: { $exists: false } },
      { revokedAt: new Date() }
    );
    recordAudit({
      req,
      action: 'auth.refresh_reuse_detected',
      actor: existing.user,
      meta: { family: existing.family },
    });
    throw ApiError.unauthorized('Session reuse detected. Please log in again.');
  }

  if (existing.expiresAt.getTime() < Date.now()) {
    throw ApiError.unauthorized('Session expired. Please log in again.');
  }

  const user = await User.findById(existing.user);
  if (!user || user.status === 'disabled') {
    await RefreshToken.updateMany(
      { family: existing.family },
      { revokedAt: new Date() }
    );
    throw ApiError.unauthorized('Account is no longer active.');
  }

  // Rotate within the same family.
  const result = await issueTokens(user, req, existing.family);
  existing.revokedAt = new Date();
  existing.replacedByHash = hashRefreshToken(result.refreshToken);
  await existing.save();

  recordAudit({
    req,
    action: 'auth.refresh',
    actor: user._id,
    actorEmail: user.email,
    role: user.role,
  });
  return result;
}

export async function logout(
  rawToken: string | undefined,
  req: Request
): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashRefreshToken(rawToken);
  const token = await RefreshToken.findOne({ tokenHash });
  if (token && !token.revokedAt) {
    token.revokedAt = new Date();
    await token.save();
    recordAudit({
      req,
      action: 'auth.logout',
      actor: token.user,
    });
  }
}
