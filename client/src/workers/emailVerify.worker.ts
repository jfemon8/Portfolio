import { verifyEmails } from '../lib/email/verify';
import type {
  EmailVerifyRequest,
  EmailWorkerMessage,
} from './emailVerify.types';

function post(message: EmailWorkerMessage): void {
  (self as unknown as Worker).postMessage(message);
}

// DNS plus the per-address classification run here, so a 100k list never blocks the UI thread.
self.onmessage = (event: MessageEvent<EmailVerifyRequest>) => {
  const request = event.data;
  if (request.type !== 'verify') return;

  verifyEmails(request.emails, {
    onProgress: ({ done, total }) => post({ type: 'progress', done, total }),
  })
    .then((results) => post({ type: 'result', results }))
    .catch((err: unknown) => {
      post({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Email verification failed.',
      });
    });
};
