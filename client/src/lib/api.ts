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
      if (!window.location.pathname.startsWith('/admin/login')) {
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

/** Fire-and-forget analytics beacon (never throws). */
export const track = (
  type: VisitType,
  path: string,
  ref?: string
): void => {
  try {
    void api.post('/analytics/track', { type, path, ref }).catch(() => undefined);
  } catch {
    /* noop */
  }
};

export default api;
