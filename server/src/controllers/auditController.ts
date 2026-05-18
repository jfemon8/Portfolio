import type { Request, Response } from 'express';
import type { RootFilterQuery } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuditLog } from '../models/AuditLog.js';
import type { IAuditLog } from '../types/index.js';

/** GET /api/audit — super-admin only (route-guarded). Paginated, newest first,
 *  optional ?action= filter. */
export const listAudit = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page)) || 1);
  const limit = Math.min(100, parseInt(String(req.query.limit)) || 25);

  const filter: RootFilterQuery<IAuditLog> = {};
  if (req.query.action) filter.action = String(req.query.action);

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});
