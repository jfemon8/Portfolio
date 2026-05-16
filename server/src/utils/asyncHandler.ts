import type { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncFn = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

/**
 * Wraps an async route handler so rejected promises are forwarded to the
 * Express error middleware instead of crashing the process.
 */
export const asyncHandler =
  (fn: AsyncFn): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
