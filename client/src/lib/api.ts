import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { ApiError, VisitType } from '@/types';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

const TOKEN_KEY = 'portfolio_token';

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (t: string): void => localStorage.setItem(TOKEN_KEY, t),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

// Attach JWT to every request when present
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface ErrorBody {
  message?: string;
  details?: ApiError['details'];
}

// Normalise errors + auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ErrorBody>) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong. Please try again.';

    if (status === 401 && tokenStore.get()) {
      tokenStore.clear();
      // Only bounce to the login screen from within the admin area. On public
      // pages a stale token must not yank the visitor off the site — just drop
      // it and let AuthContext reset state.
      const path = window.location.pathname;
      if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }

    const normalised: ApiError = {
      status,
      message,
      details: error.response?.data?.details,
    };
    return Promise.reject(normalised);
  }
);

/**
 * Opaque, cookie-less session id — an ephemeral random token kept in
 * `sessionStorage` (NOT a cookie): it dies when the tab/session closes, is
 * never sent cross-site and carries no personal data, so it lets us count
 * distinct sessions while staying privacy-friendly. Storage failures
 * (private mode) degrade silently to no session id.
 */
const SID_KEY = 'portfolio_sid';
const sessionId = (): string => {
  try {
    let s = sessionStorage.getItem(SID_KEY);
    if (!s) {
      s =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SID_KEY, s);
    }
    return s;
  } catch {
    return '';
  }
};

/** Fire-and-forget analytics beacon (never throws). */
export const track = (
  type: VisitType,
  path: string,
  ref?: string,
  depth?: number
): void => {
  try {
    void api
      .post('/analytics/track', {
        type,
        path,
        ref,
        sid: sessionId(),
        depth,
      })
      .catch(() => undefined);
  } catch {
    /* noop */
  }
};

export default api;
