import dotenv from 'dotenv';

dotenv.config();

/**
 * Centralised, validated environment access.
 * Throws early (on boot) if a required variable is missing so we never
 * deploy a half-configured server.
 */
const required = ['MONGODB_URI', 'JWT_SECRET'] as const;

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(
    `\n❌ Missing required environment variables: ${missing.join(', ')}\n` +
      `   Copy server/.env.example to server/.env and fill them in.\n`
  );
  if (process.env.NODE_ENV !== 'test') process.exit(1);
}

const toBool = (v: string | undefined, fallback = false): boolean =>
  v === undefined ? fallback : ['true', '1', 'yes'].includes(v.toLowerCase());

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
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  port: parseInt(process.env.PORT || '5000', 10),

  clientOrigins: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),

  mongoUri: process.env.MONGODB_URI as string,

  jwtSecret: process.env.JWT_SECRET as string,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  admin: {
    name: process.env.ADMIN_NAME || 'Site Admin',
    email: (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'ChangeMe!123',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || 'portfolio',
    get configured(): boolean {
      return Boolean(this.cloudName && this.apiKey && this.apiSecret);
    },
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: toBool(process.env.SMTP_SECURE, true),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    receiver: process.env.CONTACT_RECEIVER_EMAIL || process.env.SMTP_USER,
    get configured(): boolean {
      return Boolean(this.host && this.user && this.pass);
    },
  },
};

export default env;
