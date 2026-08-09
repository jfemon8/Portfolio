import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { SeoSettings } from '../models/SeoSettings.js';
import { env } from '../config/env.js';

// Dynamic robots.txt, generated per-request (Vercel has no cron) — name comes from the SeoSettings singleton, exposed at the canonical origin via vercel.json rewrites.
const SITE = env.clientOrigins[0] ?? 'http://localhost:5173';
const FALLBACK_NAME = 'Md Jannatul Ferdhous Emon — Developer Portfolio';

export const getRobots = asyncHandler(async (_req: Request, res: Response) => {
  const seo = await SeoSettings.findOne()
    .select('siteName')
    .lean<{ siteName?: string } | null>();
  const name = seo?.siteName?.trim() || FALLBACK_NAME;

  const body =
    `# ${name}\n` +
    `User-agent: *\n` +
    `Allow: /\n` +
    `Disallow: /admin\n` +
    `Disallow: /api\n\n` +
    `Sitemap: ${SITE}/sitemap.xml\n`;

  res.header('Content-Type', 'text/plain; charset=utf-8');
  res.header('Cache-Control', 'public, max-age=3600');
  res.send(body);
});
