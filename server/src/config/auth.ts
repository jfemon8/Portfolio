import type { CookieOptions } from 'express';
import { env } from './env.js';

export const authConfig = {
  accessTtl: env.jwtExpiresIn,
  refreshTtlDays: 30,
  refreshCookieName: 'rt',
  /** refresh cookie is only ever sent to the auth endpoints */
  refreshCookiePath: '/api/auth',
} as const;

export const refreshExpiryDate = (): Date =>
  new Date(Date.now() + authConfig.refreshTtlDays * 24 * 60 * 60 * 1000);

// Prod: the API is proxied under the frontend origin (locked decision), so the cookie is first-party — SameSite=Lax + Secure; dev: Lax, not secure (http://localhost).
export const refreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'lax',
  path: authConfig.refreshCookiePath,
  maxAge: authConfig.refreshTtlDays * 24 * 60 * 60 * 1000,
});

/** Same attributes minus maxAge — required for clearCookie to match. */
export const clearRefreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'lax',
  path: authConfig.refreshCookiePath,
});
