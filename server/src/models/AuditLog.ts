import mongoose, { type Model } from 'mongoose';
import type { IAuditLog } from '../types/index.js';

/**
 * Append-only security/audit trail. Written for auth events and (from P4)
 * every privileged mutation. Readable only by super admins.
 * Auto-expires after 180 days to bound storage.
 */
const auditLogSchema = new mongoose.Schema<IAuditLog>(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorEmail: { type: String, default: 'anonymous', index: true },
    role: { type: String, default: 'anonymous' },
    action: { type: String, required: true, index: true },
    entity: { type: String },
    entityId: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 180 * 24 * 60 * 60 }
);

export const AuditLog =
  (mongoose.models.AuditLog as Model<IAuditLog>) ||
  mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
export default AuditLog;
