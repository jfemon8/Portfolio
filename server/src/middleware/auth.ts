import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/User.js';
import { recordAudit } from '../services/auditService.js';
import type { UserRole } from '../types/index.js';

/**
 * Requires a valid Bearer access token. Attaches `req.user`.
 * (The refresh token lives in an HttpOnly cookie scoped to /api/auth and is
 * never used for general request auth — only by /auth/refresh.)
 */
export const protect = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) throw ApiError.unauthorized('Authentication token missing.');

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      throw ApiError.unauthorized(
        'Invalid or expired session. Please log in again.'
      );
    }

    const user = await User.findById(decoded.id);
    if (!user) throw ApiError.unauthorized('Account no longer exists.');
    if (user.status === 'disabled') {
      throw ApiError.forbidden('This account has been disabled.');
    }

    req.user = user;
    next();
  }
);

/** RBAC gate factory — allow only the given roles. */
export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      recordAudit({
        req,
        action: 'rbac.denied',
        actor: req.user._id,
        actorEmail: req.user.email,
        role: req.user.role,
        meta: { path: req.originalUrl, need: roles },
      });
      return next(
        ApiError.forbidden('You do not have access to this resource.')
      );
    }
    next();
  };

/** Super-admin only (user management, audit logs, security). */
export const requireSuperAdmin = requireRole('superAdmin');

/**
 * Back-compat alias used by all existing dashboard routes. Now also allows
 * superAdmin — critical, since the live admin (jfemon8) becomes superAdmin
 * after the role upgrade and must keep dashboard access.
 */
export const adminOnly = requireRole('admin', 'superAdmin');
