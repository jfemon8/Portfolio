import nodemailer, { type Transporter } from 'nodemailer';
import { env } from './env.js';
import { SiteContent } from '../models/SiteContent.js';
import type { ISiteContent } from '../types/index.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!env.smtp.configured) return null;

  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
  return transporter;
}

export interface ContactEmailInput {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export interface ContactEmailResult {
  sent: boolean;
  reason?: string;
}

const safe = (s: unknown): string =>
  String(s ?? '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * Sends the contact-form notification to the owner and an auto-reply to the
 * sender. Failures are logged but never block the API response.
 */
export async function sendContactEmail({
  name,
  email,
  subject,
  message,
}: ContactEmailInput): Promise<ContactEmailResult> {
  const tx = getTransporter();
  if (!tx) {
    console.warn(
      '⚠️  SMTP not configured — skipping email, message stored in DB only.'
    );
    return { sent: false, reason: 'smtp_not_configured' };
  }

  // Admin-managed templates (best-effort; any failure → hardcoded fallback).
  let ec: Partial<ISiteContent['email']> = {};
  try {
    const sc = await SiteContent.findOne()
      .select('email')
      .lean<{ email?: ISiteContent['email'] } | null>();
    ec = sc?.email ?? {};
  } catch {
    /* keep ec = {} → every field falls back below */
  }

  const tokens: Record<string, string> = {
    name: safe(name),
    email: safe(email),
    subject: safe(subject),
    message: safe(message),
  };
  const fill = (t: string): string =>
    t.replace(
      /\{\{(name|email|subject|message)\}\}/g,
      (_, k: string) => tokens[k] ?? ''
    );
  /** HTML-context copy: trim → fallback → interpolate tokens. */
  const html = (v: string | undefined, fb: string): string =>
    fill((v && v.trim()) || fb);
  /** Header-context copy (subject/from): trim → fallback, no HTML escaping. */
  const hdr = (v: string | undefined, fb: string): string =>
    (v && v.trim()) || fb;

  const ownerMail = {
    from: `"Portfolio Contact" <${env.smtp.user}>`,
    to: env.smtp.receiver,
    replyTo: email,
    subject: `${hdr(ec.ownerSubjectPrefix, '📬 New portfolio message:')} ${
      subject || 'No subject'
    }`,
    html: `
      <div style="font-family:system-ui,Segoe UI,sans-serif;max-width:600px;margin:auto;border:1px solid #1f2937;border-radius:12px;overflow:hidden">
        <div style="background:#0a0a0f;color:#00ffd1;padding:20px 24px;font-size:18px;font-weight:700">${html(
          ec.ownerHeading,
          'New Contact Message'
        )}</div>
        <div style="padding:24px;background:#0f0f17;color:#e5e7eb">
          <p><strong>Name:</strong> ${safe(name)}</p>
          <p><strong>Email:</strong> ${safe(email)}</p>
          <p><strong>Subject:</strong> ${safe(subject)}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space:pre-wrap;background:#1a1a24;padding:16px;border-radius:8px;border-left:3px solid #00ffd1">${safe(message)}</p>
        </div>
      </div>`,
  };

  const ackMail = {
    from: `"${hdr(ec.ackFromName, 'Md Jannatul Ferdhous Emon')}" <${
      env.smtp.user
    }>`,
    to: email,
    subject: hdr(ec.ackSubject, 'Thanks for reaching out! 👋'),
    html: `
      <div style="font-family:system-ui,Segoe UI,sans-serif;max-width:600px;margin:auto;border:1px solid #1f2937;border-radius:12px;overflow:hidden">
        <div style="background:#0a0a0f;color:#00ffd1;padding:20px 24px;font-size:18px;font-weight:700">${html(
          ec.ackHeading,
          'Message received ✅'
        )}</div>
        <div style="padding:24px;background:#0f0f17;color:#e5e7eb">
          <p>${html(ec.ackGreeting, 'Hi {{name}},')}</p>
          <p>${html(
            ec.ackBody,
            "Thanks for getting in touch. I've received your message and will get back to you as soon as possible."
          )}</p>
          <p style="color:#9ca3af">${html(
            ec.ackSignoff,
            '— Md Jannatul Ferdhous Emon'
          )}</p>
        </div>
      </div>`,
  };

  try {
    await Promise.all([tx.sendMail(ownerMail), tx.sendMail(ackMail)]);
    return { sent: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Email send failed:', msg);
    return { sent: false, reason: msg };
  }
}

export interface ReplyEmailInput {
  to: string;
  subject: string;
  body: string;
  original: { name: string; message: string; createdAt?: Date };
}

/**
 * Sends an admin-composed reply to a contact-form sender, quoting the
 * original message. Never throws — the caller decides how to surface a
 * failure (the admin must know the reply did not go out).
 */
export async function sendReplyEmail({
  to,
  subject,
  body,
  original,
}: ReplyEmailInput): Promise<ContactEmailResult> {
  const tx = getTransporter();
  if (!tx) return { sent: false, reason: 'smtp_not_configured' };

  // From-name follows the admin-managed ack template (fallback as in ackMail).
  let fromName = 'Md Jannatul Ferdhous Emon';
  try {
    const sc = await SiteContent.findOne()
      .select('email')
      .lean<{ email?: ISiteContent['email'] } | null>();
    fromName = sc?.email?.ackFromName?.trim() || fromName;
  } catch {
    /* keep hardcoded fallback */
  }

  const sentOn = original.createdAt
    ? new Date(original.createdAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '';

  const mail = {
    from: `"${fromName}" <${env.smtp.user}>`,
    to,
    replyTo: env.smtp.receiver,
    subject,
    html: `
      <div style="font-family:system-ui,Segoe UI,sans-serif;max-width:600px;margin:auto;border:1px solid #1f2937;border-radius:12px;overflow:hidden">
        <div style="background:#0a0a0f;color:#00ffd1;padding:20px 24px;font-size:18px;font-weight:700">${safe(fromName)}</div>
        <div style="padding:24px;background:#0f0f17;color:#e5e7eb">
          <p style="white-space:pre-wrap;margin:0">${safe(body)}</p>
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #1f2937;color:#9ca3af;font-size:13px">
            <p style="margin:0 0 8px">${sentOn ? `On ${safe(sentOn)}, ` : ''}${safe(original.name)} wrote:</p>
            <p style="white-space:pre-wrap;margin:0;background:#1a1a24;padding:12px 16px;border-radius:8px;border-left:3px solid #374151">${safe(original.message)}</p>
          </div>
        </div>
      </div>`,
  };

  try {
    await tx.sendMail(mail);
    return { sent: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Reply email send failed:', msg);
    return { sent: false, reason: msg };
  }
}

export default getTransporter;
