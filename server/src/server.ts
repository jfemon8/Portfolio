import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

/** Local / traditional Node host entry point (not used by Vercel serverless). */
async function start(): Promise<void> {
  try {
    await connectDB();
    app.listen(env.port, () => {
      console.log(
        `\n🚀 Portfolio API running on http://localhost:${env.port}` +
          `\n   Env: ${env.nodeEnv}` +
          `\n   Health: http://localhost:${env.port}/api/health\n`
      );
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Failed to start server:', msg);
    process.exit(1);
  }
}

void start();

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
