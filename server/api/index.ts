/**
 * Vercel serverless entry point.
 *
 * vercel.json routes every request here. We lazily ensure a cached Mongo
 * connection on each cold start, then hand the request to the Express app.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';

let ready: Promise<unknown> | null;

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    ready = ready || connectDB();
    await ready;
  } catch {
    ready = null; // retry the connection on the next request
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: false,
        message:
          'Database connection failed. Check MONGODB_URI in Vercel env vars.',
      })
    );
    return;
  }
  // Express app is callable as a Node request listener.
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(
    req,
    res
  );
}
