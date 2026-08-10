import type { Request, Response, NextFunction } from 'express';

/** CDN-cacheable header for public, read-only, non-personalized GET responses — lets Vercel's edge serve repeat hits without invoking the function or touching the DB. Never apply to routes with side effects (view counters) or per-visitor data. */
export const cacheControl =
  (seconds: number, swrSeconds = seconds * 5) =>
  (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader(
      'Cache-Control',
      `public, s-maxage=${seconds}, stale-while-revalidate=${swrSeconds}`
    );
    next();
  };
