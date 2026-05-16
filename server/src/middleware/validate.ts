import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

/** Collects express-validator errors into a single ApiError. */
export const validate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const details = result
    .array()
    .map((e) => ({ field: 'path' in e ? e.path : undefined, message: e.msg }));
  next(ApiError.badRequest('Validation failed', details));
};
