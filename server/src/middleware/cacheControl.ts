import type { Request, Response, NextFunction } from 'express';

/** CDN-cacheable header for public, read-only GET responses, never for routes with side effects or per-visitor data. */
export const cacheControl =
  (seconds: number, swrSeconds = seconds * 5) =>
  (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader(
      'Cache-Control',
      `public, s-maxage=${seconds}, stale-while-revalidate=${swrSeconds}`
    );
    next();
  };
