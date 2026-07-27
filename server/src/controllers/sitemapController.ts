import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Project } from '../models/Project.js';
import { BlogPost } from '../models/BlogPost.js';
import { Profile } from '../models/Profile.js';
import { publicVisibility } from './blogController.js';
import { env } from '../config/env.js';

/**
 * Dynamic XML sitemap. Generated per-request (Vercel serverless has no cron),
 * reusing the SAME public-visibility filter as the blog API so a sitemap URL
 * is never out of step with what is actually reachable (project rule #3/#8).
 * The frontend exposes it at the canonical origin via a `vercel.json` rewrite.
 */
const SITE = env.clientOrigins[0] ?? 'http://localhost:5173';

const XML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&apos;',
  '"': '&quot;',
};

const xmlEscape = (s: string): string =>
  s.replace(/[&<>'"]/g, (c) => XML_ENTITIES[c] ?? c);

interface UrlEntry {
  loc: string;
  lastmod?: Date;
  changefreq: string;
  priority: string;
  /** Absolute image URLs surfaced via the Google image-sitemap extension. */
  images?: string[];
}

const urlTag = ({
  loc,
  lastmod,
  changefreq,
  priority,
  images,
}: UrlEntry): string =>
  `<url>` +
  `<loc>${xmlEscape(SITE + loc)}</loc>` +
  (lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : '') +
  `<changefreq>${changefreq}</changefreq>` +
  `<priority>${priority}</priority>` +
  (images ?? [])
    .filter(Boolean)
    .map(
      (img) =>
        `<image:image><image:loc>${xmlEscape(img)}</image:loc></image:image>`
    )
    .join('') +
  `</url>`;

export const getSitemap = asyncHandler(async (_req: Request, res: Response) => {
  const [projects, posts, profile] = await Promise.all([
    Project.find()
      .select('slug updatedAt coverImage')
      .sort({ updatedAt: -1 })
      .lean<{ slug: string; updatedAt: Date; coverImage?: string }[]>(),
    BlogPost.find(publicVisibility())
      .select('slug updatedAt coverImage')
      .sort({ updatedAt: -1 })
      .lean<{ slug: string; updatedAt: Date; coverImage?: string }[]>(),
    Profile.findOne().select('avatar').lean<{ avatar?: string } | null>(),
  ]);

  const urls: UrlEntry[] = [
    {
      loc: '/',
      changefreq: 'weekly',
      priority: '1.0',
      images: [profile?.avatar ?? '', `${SITE}/og.png`],
    },
    { loc: '/projects', changefreq: 'weekly', priority: '0.9' },
    { loc: '/blog', changefreq: 'weekly', priority: '0.8' },
    ...projects.map((p) => ({
      loc: `/projects/${p.slug}`,
      lastmod: p.updatedAt,
      changefreq: 'monthly',
      priority: '0.7',
      images: p.coverImage ? [p.coverImage] : undefined,
    })),
    ...posts.map((b) => ({
      loc: `/blog/${b.slug}`,
      lastmod: b.updatedAt,
      changefreq: 'monthly',
      priority: '0.6',
      images: b.coverImage ? [b.coverImage] : undefined,
    })),
  ];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"` +
    ` xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">` +
    urls.map(urlTag).join('') +
    `</urlset>`;

  res.header('Content-Type', 'application/xml; charset=utf-8');
  res.header('Cache-Control', 'public, max-age=3600');
  res.send(xml);
});
