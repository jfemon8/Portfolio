import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User, type UserDoc } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import * as authService from '../services/authService.js';
import { recordAudit } from '../services/auditService.js';
import {
  authConfig,
  refreshCookieOptions,
  clearRefreshCookieOptions,
} from '../config/auth.js';

const readRefreshCookie = (req: Request): string | undefined =>
  (req.cookies as Record<string, string> | undefined)?.[
    authConfig.refreshCookieName
  ];

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const { user, accessToken, refreshToken } = await authService.login(
    email,
    password,
    req
  );
  res.cookie(
    authConfig.refreshCookieName,
    refreshToken,
    refreshCookieOptions()
  );
  res.json({ success: true, token: accessToken, user });
});

/** POST /auth/refresh — rotates the refresh cookie, returns a new access token. */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.rotateRefresh(
    readRefreshCookie(req),
    req
  );
  res.cookie(
    authConfig.refreshCookieName,
    refreshToken,
    refreshCookieOptions()
  );
  res.json({ success: true, token: accessToken, user });
});

/** POST /auth/logout — revokes the refresh token + clears the cookie. */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(readRefreshCookie(req), req);
  res.clearCookie(authConfig.refreshCookieName, clearRefreshCookieOptions());
  res.json({ success: true, message: 'Logged out.' });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, user: authService.toPublicUser(req.user!) });
});

export const updatePassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };
    if (!newPassword || newPassword.length < 8) {
      throw ApiError.badRequest('New password must be at least 8 characters.');
    }
    const user = await User.findById(req.user!._id).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) {
      throw ApiError.unauthorized('Current password is incorrect.');
    }
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();
    // Revoke every outstanding refresh token so a stolen one can't mint new access tokens; combined with the passwordChangedAt check in `protect`, this ends all prior sessions (including this one).
    await RefreshToken.updateMany(
      { user: user._id, revokedAt: { $exists: false } },
      { revokedAt: new Date() }
    );
    recordAudit({
      req,
      action: 'auth.password_changed',
      actor: user._id,
      actorEmail: user.email,
      role: user.role,
    });
    res.json({
      success: true,
      message: 'Password updated. Please log in again with your new password.',
    });
  }
);

export const updateProfileMeta = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, avatar } = req.body as { name?: string; avatar?: string };
    const user = await User.findById(req.user!._id);
    if (!user) throw ApiError.notFound('Account not found');
    if (name) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    await user.save({ validateBeforeSave: false });
    res.json({
      success: true,
      user: authService.toPublicUser(user as UserDoc),
    });
  }
);
