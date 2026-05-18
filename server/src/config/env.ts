import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Type-safe, fail-fast environment validation (Zod).
 * The exported `env` object keeps the exact same shape used across the app,
 * so this is a hardening change with zero behavioural impact.
 */
const boolish = z
  .string()
  .optional()
  .transform((v) =>
    v === undefined ? undefined : ['true', '1', 'yes'].includes(v.toLowerCase())
  );

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be a long random string'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  ADMIN_NAME: z.string().default('Site Admin'),
  ADMIN_EMAIL: z.string().default('admin@example.com'),
  ADMIN_PASSWORD: z.string().default('ChangeMe!123'),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default('portfolio'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: boolish,
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  CONTACT_RECEIVER_EMAIL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  console.error(
    `\n❌ Invalid environment configuration:\n${issues}\n` +
      `   Copy server/.env.example to server/.env and fill it in.\n`
  );
  if (process.env.NODE_ENV !== 'test') process.exit(1);
}

const e = (
  parsed.success ? parsed.data : ({} as z.infer<typeof envSchema>)
) as z.infer<typeof envSchema>;

interface CloudinaryEnv {
  cloudName?: string;
  apiKey?: string;
  apiSecret?: string;
  folder: string;
  readonly configured: boolean;
}

interface SmtpEnv {
  host?: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  receiver?: string;
  readonly configured: boolean;
}

export interface Env {
  nodeEnv: string;
  isProd: boolean;
  port: number;
  clientOrigins: string[];
  mongoUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  admin: { name: string; email: string; password: string };
  cloudinary: CloudinaryEnv;
  smtp: SmtpEnv;
}

export const env: Env = {
  nodeEnv: e.NODE_ENV ?? 'development',
  isProd: (e.NODE_ENV ?? 'development') === 'production',
  port: e.PORT ?? 5000,

  clientOrigins: (e.CLIENT_URL ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),

  mongoUri: e.MONGODB_URI,

  jwtSecret: e.JWT_SECRET,
  jwtExpiresIn: e.JWT_EXPIRES_IN ?? '7d',

  admin: {
    name: e.ADMIN_NAME ?? 'Site Admin',
    email: (e.ADMIN_EMAIL ?? 'admin@example.com').toLowerCase(),
    password: e.ADMIN_PASSWORD ?? 'ChangeMe!123',
  },

  cloudinary: {
    cloudName: e.CLOUDINARY_CLOUD_NAME,
    apiKey: e.CLOUDINARY_API_KEY,
    apiSecret: e.CLOUDINARY_API_SECRET,
    folder: e.CLOUDINARY_FOLDER ?? 'portfolio',
    get configured(): boolean {
      return Boolean(this.cloudName && this.apiKey && this.apiSecret);
    },
  },

  smtp: {
    host: e.SMTP_HOST,
    port: e.SMTP_PORT ?? 465,
    secure: e.SMTP_SECURE ?? true,
    user: e.SMTP_USER,
    pass: e.SMTP_PASS,
    receiver: e.CONTACT_RECEIVER_EMAIL ?? e.SMTP_USER,
    get configured(): boolean {
      return Boolean(this.host && this.user && this.pass);
    },
  },
};

export default env;
