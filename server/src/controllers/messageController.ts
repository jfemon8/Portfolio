import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Message } from '../models/Message.js';
import { Visit } from '../models/Visit.js';
import { sendContactEmail } from '../config/mailer.js';

/** Public — submit the contact form. Stores in DB + emails owner & sender. */
export const submitMessage = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, email, subject, message } = req.body as {
      name: string;
      email: string;
      subject?: string;
      message: string;
    };

    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]) ||
      req.ip ||
      '';

    const doc = await Message.create({
      name,
      email,
      subject,
      message,
      ip,
      userAgent: req.headers['user-agent'] || '',
    });

    Visit.create({ type: 'contact_submit', path: '/contact' }).catch(() => {});
    const mail = await sendContactEmail({ name, email, subject, message });

    res.status(201).json({
      success: true,
      message: "Thanks! Your message has been sent — I'll reply soon.",
      emailDelivered: mail.sent,
      id: doc._id,
    });
  }
);

/* ----- Admin ----- */
export const listMessages = asyncHandler(
  async (req: Request, res: Response) => {
    const filter: Record<string, unknown> = {};
    if (req.query.filter === 'unread') filter.read = false;
    else if (req.query.filter === 'starred') filter.starred = true;
    else if (req.query.filter === 'archived') filter.archived = true;
    else if (req.query.filter !== 'all') filter.archived = { $ne: true };

    const messages = await Message.find(filter).sort({ createdAt: -1 });
    const unread = await Message.countDocuments({ read: false });
    res.json({ success: true, count: messages.length, unread, data: messages });
  }
);

export const updateMessage = asyncHandler(
  async (req: Request, res: Response) => {
    const { read, starred, archived } = req.body as {
      read?: boolean;
      starred?: boolean;
      archived?: boolean;
    };
    const msg = await Message.findByIdAndUpdate(
      req.params.id,
      { read, starred, archived },
      { new: true }
    );
    if (!msg) throw ApiError.notFound('Message not found');
    res.json({ success: true, data: msg });
  }
);

export const deleteMessage = asyncHandler(
  async (req: Request, res: Response) => {
    const msg = await Message.findByIdAndDelete(req.params.id);
    if (!msg) throw ApiError.notFound('Message not found');
    res.json({ success: true, message: 'Message deleted' });
  }
);
