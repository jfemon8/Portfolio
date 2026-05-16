import type { HydratedDocument } from 'mongoose';
import type { IUser } from './index.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by the `protect` auth middleware. */
      user?: HydratedDocument<IUser>;
    }
  }
}

export {};
