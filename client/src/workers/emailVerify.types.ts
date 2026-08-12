import type { VerifiedEmail } from '@/lib/email/verify';
import type { DomainInfo } from '@/lib/email/dns';

export interface EmailVerifyRequest {
  type: 'verify';
  emails: string[];
  /** Domain-only, in-memory cache supplied by the current browser session. */
  domainCache?: Array<[string, DomainInfo]>;
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
