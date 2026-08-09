import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiError, VisitType } from '@/types';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
  // Sends the httpOnly refresh cookie.
  withCredentials: true,
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

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

/** Shared in-flight refresh call, so concurrent 401s share one /auth/refresh. */
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ token: string }>(
        `${baseURL}/auth/refresh`,
        {},
        { withCredentials: true }
      )
      .then((res) => {
        tokenStore.set(res.data.token);
        return res.data.token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const forceLogout = (): void => {
  tokenStore.clear();
  // Only bounce to login within the admin area; on public pages a stale token must not yank the visitor off, so we just drop it.
  const path = window.location.pathname;
  if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
    window.location.href = '/admin/login';
  }
};

// On 401, silently refresh via cookie and retry once; else auto-logout.
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ErrorBody>) => {
    const status = error.response?.status;
    const original = error.config as RetriableConfig | undefined;
    const url = original?.url || '';
    const isAuthEndpoint =
      url.includes('/auth/refresh') || url.includes('/auth/login');

    if (
      status === 401 &&
      original &&
      !original._retried &&
      !isAuthEndpoint &&
      tokenStore.get()
    ) {
      original._retried = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        forceLogout();
      }
    } else if (status === 401 && tokenStore.get()) {
      forceLogout();
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong. Please try again.';
    const normalised: ApiError = {
      status,
      message,
      details: error.response?.data?.details,
    };
    return Promise.reject(normalised);
  }
);

// Opaque sessionStorage id (not a cookie): dies with the tab, privacy-friendly, degrades silently to no id if storage fails (e.g. private mode).
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
