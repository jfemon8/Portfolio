import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { SeoSettings } from '../models/SeoSettings.js';
import { env } from '../config/env.js';

/**
 * Dynamic PWA manifest + robots.txt. Generated per-request (Vercel serverless
 * has no cron), name/description driven by the admin SeoSettings singleton and
 * the robots sitemap origin reused from env — the SAME approach as the dynamic
 * sitemapController (project rule #3/#8). The frontend exposes both at the
 * canonical origin via `vercel.json` rewrites (the static `public/` copies
 * were removed so the rewrites are not shadowed).
 */
const SITE = env.clientOrigins[0] ?? 'http://localhost:5173';
const FALLBACK_NAME = 'Md Jannatul Ferdhous Emon — Developer Portfolio';
const FALLBACK_DESC =
  'Assistant Front-End Developer building responsive, dynamic MERN applications.';

export const getManifest = asyncHandler(
  async (_req: Request, res: Response) => {
    const seo = await SeoSettings.findOne()
      .select('siteName metaTitle metaDescription')
      .lean<{
        siteName?: string;
        metaTitle?: string;
        metaDescription?: string;
      } | null>();

    const name =
      seo?.siteName?.trim() || seo?.metaTitle?.trim() || FALLBACK_NAME;
    const shortName = name.split(/[\s—–-]+/)[0] || 'Portfolio';
    const description = seo?.metaDescription?.trim() || FALLBACK_DESC;

    const manifest = {
      name,
      short_name: shortName,
      description,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#0a0a0f',
      theme_color: '#0a0a0f',
      icons: [
        {
          src: '/favicon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any maskable',
        },
      ],
    };

    res.header('Content-Type', 'application/manifest+json; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(JSON.stringify(manifest));
  }
);

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
