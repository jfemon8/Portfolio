import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/User.js';

/** Requires a valid Bearer JWT. Attaches `req.user`. */
export const protect = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) throw ApiError.unauthorized('Authentication token missing.');

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      throw ApiError.unauthorized(
        'Invalid or expired session. Please log in again.'
      );
    }

    const user = await User.findById(decoded.id);
    if (!user) throw ApiError.unauthorized('Account no longer exists.');

    req.user = user;
    next();
  }
);

/** Restricts to admins (all dashboard routes). */
export const adminOnly = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'admin') {
    return next(ApiError.forbidden('Admin access required.'));
  }
  next();
};
