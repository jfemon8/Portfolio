import type { UserDoc } from '../models/User.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by the `protect` auth middleware (full Mongoose user doc). */
      user?: UserDoc;
    }
  }
}

export {};
