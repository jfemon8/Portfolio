import type { ExtractionResult } from '@/lib/email/extract';

export interface EmailExtractRequest {
  type: 'extract';
  id: number;
  text: string;
}

export interface EmailExtractResultMessage {
  type: 'result';
  id: number;
  extraction: ExtractionResult;
}

export interface EmailExtractErrorMessage {
  type: 'error';
  id: number;
  message: string;
}

export type EmailExtractWorkerMessage =
  | EmailExtractResultMessage
  | EmailExtractErrorMessage;
