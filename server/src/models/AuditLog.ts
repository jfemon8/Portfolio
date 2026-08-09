import mongoose, { type Model } from 'mongoose';
import type { IAuditLog } from '../types/index.js';

// Append-only audit trail (auth events + privileged mutations); super-admin-read-only, auto-expires after 180 days.
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
