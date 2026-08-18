import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Project } from '../models/Project.js';
import { BlogPost } from '../models/BlogPost.js';
import { Profile } from '../models/Profile.js';
import { Tool } from '../models/Tool.js';
import { SeoSettings } from '../models/SeoSettings.js';
import { publicVisibility } from './blogController.js';
import { canonicalOrigin } from '../utils/canonicalOrigin.js';

// Dynamic XML sitemap, generated per-request (Vercel has no cron) — reuses the blog API's public-visibility filter so URLs never outpace what's reachable; exposed via a vercel.json rewrite.

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

const urlTag = (
  site: string,
  { loc, lastmod, changefreq, priority, images }: UrlEntry
): string =>
  `<url>` +
  `<loc>${xmlEscape(site + loc)}</loc>` +
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
  const [projects, posts, tools, profile, seo] = await Promise.all([
    Project.find()
      .select('slug updatedAt coverImage')
      .sort({ updatedAt: -1 })
      .lean<{ slug: string; updatedAt: Date; coverImage?: string }[]>(),
    BlogPost.find(publicVisibility())
      .select('slug updatedAt coverImage')
      .sort({ updatedAt: -1 })
      .lean<{ slug: string; updatedAt: Date; coverImage?: string }[]>(),
    Tool.find()
      .select('slug updatedAt')
      .sort({ order: 1 })
      .lean<{ slug: string; updatedAt: Date }[]>(),
    Profile.findOne().select('avatar').lean<{ avatar?: string } | null>(),
    SeoSettings.findOne().select('siteUrl').lean<{ siteUrl?: string } | null>(),
  ]);

  const SITE = canonicalOrigin(seo?.siteUrl);
  // A blank slug would emit the parent listing's URL again, so it is dropped rather than duplicated.
  const slugged = <T extends { slug?: string }>(rows: T[]): T[] =>
    rows.filter((r) => Boolean(r.slug?.trim()));

  // Newest child timestamp, so a hub's lastmod actually moves when its listing changes.
  const newest = (rows: { updatedAt: Date }[]): Date | undefined =>
    rows.length ? rows[0]?.updatedAt : undefined;

  const urls: UrlEntry[] = [
    {
      loc: '/',
      changefreq: 'weekly',
      priority: '1.0',
      images: [profile?.avatar ?? '', `${SITE}/og.png`],
    },
    {
      loc: '/projects',
      lastmod: newest(projects),
      changefreq: 'weekly',
      priority: '0.9',
    },
    // The tools are the pages search traffic actually lands on, so they rank above the blog here.
    {
      loc: '/tools',
      lastmod: newest(tools),
      changefreq: 'weekly',
      priority: '0.9',
    },
    { loc: '/tools/jobs', changefreq: 'daily', priority: '0.8' },
    {
      loc: '/blog',
      lastmod: newest(posts),
      changefreq: 'weekly',
      priority: '0.8',
    },
    ...slugged(tools).map((t) => ({
      loc: `/tools/${t.slug}`,
      lastmod: t.updatedAt,
      changefreq: 'monthly',
      priority: '0.8',
    })),
    ...slugged(projects).map((p) => ({
      loc: `/projects/${p.slug}`,
      lastmod: p.updatedAt,
      changefreq: 'monthly',
      priority: '0.7',
      images: p.coverImage ? [p.coverImage] : undefined,
    })),
    ...slugged(posts).map((b) => ({
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
    urls.map((u) => urlTag(SITE, u)).join('') +
    `</urlset>`;

  res.header('Content-Type', 'application/xml; charset=utf-8');
  res.header('Cache-Control', 'public, max-age=3600');
  res.send(xml);
});
