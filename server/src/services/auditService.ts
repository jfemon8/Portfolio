import type { Request } from 'express';
import { AuditLog } from '../models/AuditLog.js';
import type { AuditAction, IAuditLog, UserRole } from '../types/index.js';

/** Coarse client info — best-effort, never throws. */
export function clientInfo(req: Request): { ip: string; userAgent: string } {
  const fwd = req.headers['x-forwarded-for'];
  const ip =
    (Array.isArray(fwd) ? fwd[0] : fwd?.split(',')[0]?.trim()) || req.ip || '';
  return { ip, userAgent: (req.headers['user-agent'] || '').slice(0, 300) };
}

interface AuditInput {
  req: Request;
  action: AuditAction;
  actor?: IAuditLog['actor'];
  actorEmail?: string;
  role?: UserRole | 'anonymous';
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}

// Fire-and-forget: a logging failure must never break the request it's recording.
export function recordAudit(input: AuditInput): void {
  const { ip, userAgent } = clientInfo(input.req);
  void AuditLog.create({
    actor: input.actor,
    actorEmail: input.actorEmail || 'anonymous',
    role: input.role || 'anonymous',
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    meta: input.meta,
    ip,
    userAgent,
  }).catch((e: unknown) => {
    console.warn(
      'audit log failed:',
      e instanceof Error ? e.message : String(e)
    );
  });
}
