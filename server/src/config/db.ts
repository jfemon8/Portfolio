import mongoose from 'mongoose';
import { env } from './env.js';

// Connection cache for serverless (Vercel) — each warm invocation reuses the existing connection instead of opening a new pool.
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __mongoose: MongooseCache | undefined;
}

const cached: MongooseCache =
  global.__mongoose ?? (global.__mongoose = { conn: null, promise: null });

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    mongoose.set('strictQuery', true);
    cached.promise = mongoose
      .connect(env.mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000,
      })
      .then((m) => {
        console.log(
          `✅ MongoDB connected: ${m.connection.host}/${m.connection.name}`
        );
        return m;
      })
      .catch((err: unknown) => {
        cached.promise = null;
        const msg = err instanceof Error ? err.message : String(err);
        console.error('❌ MongoDB connection error:', msg);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;
