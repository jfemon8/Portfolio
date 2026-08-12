import { extractEmails } from '../lib/email/extract';
import type {
  EmailExtractRequest,
  EmailExtractWorkerMessage,
} from './emailExtract.types';

function post(message: EmailExtractWorkerMessage): void {
  (self as unknown as Worker).postMessage(message);
}

// Extraction can involve megabytes of pasted CSV/HTML. Keep regex scanning out
// of React's event loop so typing, scrolling and cancelling always stay smooth.
self.onmessage = (event: MessageEvent<EmailExtractRequest>) => {
  const request = event.data;
  if (request.type !== 'extract') return;

  try {
    post({
      type: 'result',
      id: request.id,
      extraction: extractEmails(request.text),
    });
  } catch (err: unknown) {
    post({
      type: 'error',
      id: request.id,
      message: err instanceof Error ? err.message : 'Could not scan the input.',
    });
  }
};
