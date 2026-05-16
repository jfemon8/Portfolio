import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { env } from '../config/env.js';

/** 404 handler for unmatched routes. */
export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

interface MongooseLikeError extends Error {
  statusCode?: number;
  details?: unknown;
  path?: string;
  value?: unknown;
  code?: number;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, { message: string }>;
}

/** Central error handler — last middleware in the chain. */
export const errorHandler: ErrorRequestHandler = (
  err: MongooseLikeError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}: ${String(err.value)}`;
  }
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value for "${field}".`;
  }
  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => e.message);
  }
  if (err.name === 'MulterError') {
    status = 400;
    message = `Upload error: ${err.message}`;
  }

  if (status >= 500) console.error('💥', err);

  res.status(status).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(env.isProd ? {} : { stack: err.stack }),
  });
};
