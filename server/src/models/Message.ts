import mongoose, { type Model } from 'mongoose';
import type { IMessage } from '../types/index.js';

const messageSchema = new mongoose.Schema<IMessage>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, default: '' },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    starred: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    replied: { type: Boolean, default: false },
    repliedAt: { type: Date },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

messageSchema.index({ read: 1, createdAt: -1 });
messageSchema.index({ archived: 1, createdAt: -1 });

export const Message =
  (mongoose.models.Message as Model<IMessage>) ||
  mongoose.model<IMessage>('Message', messageSchema);
export default Message;
