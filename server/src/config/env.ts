import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Fail-fast Zod validation; env keeps the exact shape the app already expects, so this adds safety with zero behavioural impact.
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
  // Separate from CLIENT_URL: that is a CORS allow-list which may hold several origins, while sitemap/robots need the one canonical origin.
  SITE_URL: z.string().optional(),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be a long random string (32+ chars)'),
  JWT_EXPIRES_IN: z.string().default('15m'),

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

  /** JSON array of approved public RSS/JSON job feeds. Never add private endpoints here. */
  JOB_FEEDS: z.string().optional(),
  CRON_SECRET: z.string().min(16).optional(),
  /** Least-privilege Mongo URI for the ingestion agent — jobs collections only. */
  JOBS_AGENT_MONGODB_URI: z.string().optional(),
  /** Lookback for postings with no stated deadline; a live deadline always wins over this. */
  JOB_SYNC_LOOKBACK_DAYS: z.coerce.number().int().min(0).max(90).default(30),
  /** Default validity in days applied when a posting states no deadline. */
  JOB_DEFAULT_VALIDITY_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .max(365)
    .default(30),
  /** Automated listings unseen in any sync for this many days are purged. 0 disables the purge. */
  JOB_RETENTION_DAYS: z.coerce.number().int().min(0).max(365).default(45),
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

export interface JobFeedConfig {
  key: string;
  name: string;
  url: string;
  format:
    | 'rss'
    | 'json'
    | 'lever'
    | 'greenhouse'
    | 'smartrecruiters'
    | 'remote'
    | 'crawl';
  /** Which crawler definition handles this source when `format` is `crawl`. */
  crawler?: string;
  company?: string;
  category?: 'government' | 'private' | 'it' | 'bank' | 'ngo' | 'other';
  /** Keep only postings whose declared location is in Bangladesh. */
  bangladeshOnly?: boolean;
  /** Per-feed fetch budget for unusually large or slow endpoints. */
  timeoutMs?: number;
  /** Keep only postings whose title matches (regex source). */
  include?: string;
  /** Drop postings whose title matches (regex source) — results, admit cards, notices. */
  exclude?: string;
  /** Source publishes Bengali circular headlines, so the employer is read out of the title. */
  circularTitles?: boolean;
}

// Add sources through JOB_FEEDS only after reviewing their access terms and robots policy.
const DEFAULT_JOB_FEEDS: JobFeedConfig[] = [
  {
    key: 'cse-eee-jobs-bd',
    name: 'CSE/EEE Jobs in Bangladesh',
    url: 'https://cse-eee-jobs-bd.github.io/feed.xml',
    format: 'rss',
    category: 'it',
  },
  {
    key: 'braincode-recruitment',
    name: 'BrainCode Recruitment',
    url: 'https://career.braincode.com.bd/?feed=job_feed&sh_atts=job_per_page:15%7Cjob_view:view-default%7Cjob_excerpt:20%7Cjob_order:DESC%7Cjob_orderby:date%7Cjob_pagination:yes%7Cjob_filters:yes%7Cjob_filters_loc:yes%7Cjob_filters_date:yes%7Cjob_filters_type:yes%7Cjob_filters_sector:yes%7Cjob_custom_fields_switch:no%7Cjob_deadline_switch:no%7Cquick_apply_job:no%7Cjob_loc_listing:country,city',
    format: 'rss',
    category: 'it',
  },
  // Public Lever APIs; `bangladeshOnly` keeps non-BD openings out of this collection.
  {
    key: 'field-nation-bangladesh',
    name: 'Field Nation Bangladesh',
    url: 'https://api.lever.co/v0/postings/fieldnation?mode=json',
    format: 'lever',
    company: 'Field Nation',
    category: 'it',
    bangladeshOnly: true,
  },
  {
    key: 'rws-bangladesh',
    name: 'RWS Bangladesh',
    url: 'https://api.lever.co/v0/postings/rws?mode=json',
    format: 'lever',
    company: 'RWS',
    category: 'it',
    bangladeshOnly: true,
  },
  {
    key: 'aleph-bangladesh',
    name: 'Aleph Bangladesh',
    url: 'https://api.lever.co/v0/postings/aleph?mode=json',
    format: 'lever',
    company: 'Aleph',
    category: 'private',
    bangladeshOnly: true,
  },
  // SmartRecruiters public board; verified live serving a Dhaka-based listing.
  {
    key: 'shopup-smartrecruiters',
    name: 'ShopUp',
    url: 'https://api.smartrecruiters.com/v1/companies/shopup/postings',
    format: 'smartrecruiters',
    company: 'ShopUp',
    category: 'it',
    bangladeshOnly: true,
  },
  // Crawled because no ATS feed carries Bangladeshi government circulars.
  {
    key: 'bdjobstoday',
    name: 'BDJobsToday',
    url: 'https://bdjobstoday.com/',
    format: 'crawl',
    crawler: 'bdjobstoday',
    timeoutMs: 20_000,
  },
  // WordPress circular blogs: their own RSS beats crawling, filtered to recruitment posts only.
  ...[
    ['bdgovtjob', 'BD Govt Job', 'https://bdgovtjob.net/feed/'],
    ['ejobscircular', 'eJobsCircular', 'https://ejobscircular.com/feed/'],
    ['chakrirkhobor', 'Chakrir Khobor', 'https://chakrirkhobor.net/feed/'],
    // Verified live: Bengali circulars spanning banks, govt and private employers, robots-permitted.
    ['bdjobscareer', 'BDJobs Career', 'https://bdjobscareer.com/feed/'],
  ].map(
    ([key, label, url]): JobFeedConfig => ({
      key: key ?? '',
      name: label ?? '',
      url: url ?? '',
      format: 'rss',
      category: 'government',
      circularTitles: true,
      include: '(circular|নিয়োগ|চাকরি|vacancy|recruitment|job)',
      // Blocks the guides, results and admit-card posts these blogs publish alongside vacancies.
      exclude:
        '(result|ফলাফল|admit\\s*card|প্রবেশপত্র|seat\\s*plan|routine|syllabus|সিলেবাস|question|suggestion|salary\\s*guide|iqama|renewal|how\\s*to|কিভাবে|guide\\b|tips|বেতন\\s*স্কেল)',
      timeoutMs: 20_000,
    })
  ),

  // Server-rendered circular portals; the crawler re-verifies robots.txt at run time.
  {
    key: 'duranta',
    name: 'Duranta',
    url: 'https://duranta.app/circulars',
    format: 'crawl',
    crawler: 'duranta',
    category: 'government',
    timeoutMs: 20_000,
  },
  {
    key: 'biddabari',
    name: 'Biddabari',
    url: 'https://biddabari.com/job-circular',
    format: 'crawl',
    crawler: 'biddabari',
    category: 'government',
    timeoutMs: 20_000,
  },
  {
    key: 'livemcq',
    name: 'LiveMCQ',
    url: 'https://web.livemcq.com/blog/category/job-circular',
    format: 'crawl',
    crawler: 'livemcq',
    category: 'government',
    timeoutMs: 20_000,
  },
  {
    key: 'optimalitjobs',
    name: 'Optimal IT Jobs',
    url: 'https://www.optimalitjobs.com/circulars',
    format: 'crawl',
    crawler: 'optimalit',
    category: 'government',
    timeoutMs: 20_000,
  },
  {
    key: 'google-careers',
    name: 'Google Careers',
    url: 'https://www.google.com/about/careers/applications/jobs/results',
    format: 'crawl',
    crawler: 'google-careers',
    company: 'Google',
    category: 'it',
    timeoutMs: 25_000,
  },

  // ---- Worldwide remote boards (documented public APIs) ----
  {
    key: 'arbeitnow',
    name: 'Arbeitnow',
    url: 'https://www.arbeitnow.com/api/job-board-api',
    format: 'remote',
  },
  {
    key: 'remotive',
    name: 'Remotive',
    url: 'https://remotive.com/api/remote-jobs?limit=100',
    format: 'remote',
  },
  {
    key: 'jobicy',
    name: 'Jobicy',
    url: 'https://jobicy.com/api/v2/remote-jobs?count=50',
    format: 'remote',
  },

  // ---- Tech-giant boards on Greenhouse's public API; every slug verified live ----
  ...[
    ['stripe', 'Stripe'],
    ['cloudflare', 'Cloudflare'],
    ['databricks', 'Databricks'],
    ['figma', 'Figma'],
    ['gitlab', 'GitLab'],
    ['reddit', 'Reddit'],
    ['coinbase', 'Coinbase'],
    ['airbnb', 'Airbnb'],
    ['dropbox', 'Dropbox'],
    ['robinhood', 'Robinhood'],
    ['twilio', 'Twilio'],
    ['asana', 'Asana'],
    ['pinterest', 'Pinterest'],
    ['instacart', 'Instacart'],
    ['anthropic', 'Anthropic'],
  ].map(
    ([slug, label]): JobFeedConfig => ({
      key: `greenhouse-${slug ?? ''}`,
      name: `${label ?? ''} Careers`,
      url: `https://boards-api.greenhouse.io/v1/boards/${slug ?? ''}/jobs?content=true`,
      format: 'greenhouse',
      company: label,
      category: 'it',
      timeoutMs: 25_000,
    })
  ),
];

function parseJobFeeds(raw?: string): JobFeedConfig[] {
  if (!raw) return [];
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    // Falling back to the vetted defaults beats going silently dark on a typo.
    console.warn(
      '⚠️  JOB_FEEDS is not valid JSON — using the built-in default feeds instead.'
    );
    return DEFAULT_JOB_FEEDS;
  }
  if (!Array.isArray(candidate)) {
    console.warn(
      '⚠️  JOB_FEEDS must be a JSON array — using the built-in default feeds instead.'
    );
    return DEFAULT_JOB_FEEDS;
  }
  {
    const accepted = candidate.slice(0, 20).flatMap((item): JobFeedConfig[] => {
      if (!item || typeof item !== 'object') return [];
      const value = item as Record<string, unknown>;
      const key = typeof value.key === 'string' ? value.key.trim() : '';
      const name = typeof value.name === 'string' ? value.name.trim() : '';
      const url = typeof value.url === 'string' ? value.url.trim() : '';
      const format = [
        'rss',
        'json',
        'lever',
        'greenhouse',
        'remote',
        'crawl',
      ].includes(String(value.format))
        ? (value.format as JobFeedConfig['format'])
        : null;
      try {
        if (!key || !name || !format || new URL(url).protocol !== 'https:')
          return [];
      } catch {
        return [];
      }
      return [
        {
          key: key.slice(0, 80),
          name: name.slice(0, 120),
          url,
          format,
          crawler:
            typeof value.crawler === 'string'
              ? value.crawler.slice(0, 40)
              : undefined,
          company:
            typeof value.company === 'string'
              ? value.company.slice(0, 160)
              : undefined,
          category: [
            'government',
            'private',
            'it',
            'bank',
            'ngo',
            'other',
          ].includes(String(value.category))
            ? (value.category as JobFeedConfig['category'])
            : undefined,
          bangladeshOnly: value.bangladeshOnly === true,
          circularTitles: value.circularTitles === true,
          include:
            typeof value.include === 'string'
              ? value.include.slice(0, 300)
              : undefined,
          exclude:
            typeof value.exclude === 'string'
              ? value.exclude.slice(0, 300)
              : undefined,
          timeoutMs:
            typeof value.timeoutMs === 'number' &&
            value.timeoutMs >= 1000 &&
            value.timeoutMs <= 60_000
              ? value.timeoutMs
              : undefined,
        },
      ];
    });
    const dropped = Math.min(candidate.length, 20) - accepted.length;
    if (dropped > 0) {
      console.warn(
        `⚠️  JOB_FEEDS: ${dropped} entr${dropped === 1 ? 'y was' : 'ies were'} ignored (each needs key, name, a rss/json/lever format and an https url).`
      );
    }
    // De-duplicates by key so one feed can never be synced twice per run.
    return [...new Map(accepted.map((feed) => [feed.key, feed])).values()];
  }
}

export interface Env {
  nodeEnv: string;
  isProd: boolean;
  port: number;
  clientOrigins: string[];
  /** The single canonical origin every emitted URL must use. */
  siteUrl: string;
  mongoUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  admin: { name: string; email: string; password: string };
  cloudinary: CloudinaryEnv;
  smtp: SmtpEnv;
  jobFeeds: JobFeedConfig[];
  cronSecret?: string;
  jobSync: {
    lookbackDays: number;
    retentionDays: number;
    validityDays: number;
    agentUri?: string;
  };
}

export const env: Env = {
  nodeEnv: e.NODE_ENV ?? 'development',
  isProd: (e.NODE_ENV ?? 'development') === 'production',
  port: e.PORT ?? 5000,

  clientOrigins: (e.CLIENT_URL ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),

  siteUrl: (
    e.SITE_URL ??
    (e.CLIENT_URL ?? 'http://localhost:5173').split(',')[0] ??
    'http://localhost:5173'
  )
    .trim()
    .replace(/\/$/, ''),

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
    // Implicit TLS only applies to port 465; ports 587/25 use STARTTLS, so defaulting secure to true regardless of port would break those setups.
    secure: e.SMTP_SECURE ?? (e.SMTP_PORT ?? 465) === 465,
    user: e.SMTP_USER,
    pass: e.SMTP_PASS,
    receiver: e.CONTACT_RECEIVER_EMAIL ?? e.SMTP_USER,
    get configured(): boolean {
      return Boolean(this.host && this.user && this.pass);
    },
  },
  // Unset uses the vetted default; JOB_FEEDS=[] disables every automatic source.
  jobFeeds:
    e.JOB_FEEDS === undefined ? DEFAULT_JOB_FEEDS : parseJobFeeds(e.JOB_FEEDS),
  cronSecret: e.CRON_SECRET,
  jobSync: {
    lookbackDays: e.JOB_SYNC_LOOKBACK_DAYS,
    retentionDays: e.JOB_RETENTION_DAYS,
    validityDays: e.JOB_DEFAULT_VALIDITY_DAYS,
    agentUri: e.JOBS_AGENT_MONGODB_URI,
  },
};

export default env;
