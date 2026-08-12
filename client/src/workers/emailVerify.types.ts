import type { VerifiedEmail } from '@/lib/email/verify';

export interface EmailVerifyRequest {
  type: 'verify';
  emails: string[];
}

export interface EmailProgressMessage {
  type: 'progress';
  done: number;
  total: number;
}

export interface EmailResultMessage {
  type: 'result';
  results: VerifiedEmail[];
}

export interface EmailErrorMessage {
  type: 'error';
  message: string;
}

export type EmailWorkerMessage =
  | EmailProgressMessage
  | EmailResultMessage
  | EmailErrorMessage;
