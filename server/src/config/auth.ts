import type { CookieOptions } from 'express';
import { env } from './env.js';

/**
 * Auth/token configuration.
 *
 * Phased-evolution note: ACCESS token TTL stays driven by env.jwtExpiresIn
 * (currently long) so the LIVE frontend — which still holds a Bearer token in
 * memory/localStorage and has no silent-refresh wiring yet — is NOT logged
 * out. At the P2 frontend cutover this drops to ~15m with silent refresh.
 */
export const authConfig = {
  accessTtl: env.jwtExpiresIn, // e.g. '7d' now → '15m' after cutover
  refreshTtlDays: 30,
  refreshCookieName: 'rt',
  /** refresh cookie is only ever sent to the auth endpoints */
  refreshCookiePath: '/api/auth',
} as const;

export const refreshExpiryDate = (): Date =>
  new Date(Date.now() + authConfig.refreshTtlDays * 24 * 60 * 60 * 1000);

/**
 * Refresh-cookie options.
 * Prod: the API is proxied under the frontend origin (locked decision) → the
 * cookie is first-party, so SameSite=Lax + Secure is correct & robust.
 * Dev: Lax, not secure (http://localhost).
 */
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
