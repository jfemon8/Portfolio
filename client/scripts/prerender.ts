// Post-build step: writes one static HTML file per public route with that route's real title, meta and JSON-LD.
// The SPA still hydrates normally — this only fixes the *initial* HTML, which is all a non-JS crawler (Bing,
// Facebook, LinkedIn, Slack) ever sees, and what lets Google index a deep page without waiting to render it.
// Fails open: any error leaves the plain SPA build in place rather than breaking the deploy.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PAGE_SEO } from '../src/lib/pageSeo';
import { TOOL_SEO, fallbackToolSeo } from '../src/lib/toolSeo';
import { resolveSeo, type SeoSettingsLike } from '../src/lib/seoMeta';
import { setSiteOrigin } from '../src/config/site';
import {
  articleSchema,
  breadcrumbSchema,
  collectionPageSchema,
  personSchema,
  profilePageSchema,
  projectSchema,
  softwareApplicationSchema,
  websiteSchema,
} from '../src/lib/structuredData';
import type {
  BlogPostDoc,
  ProfileDoc,
  ProjectDoc,
  SeoSettingsDoc,
  ToolDoc,
} from '../src/types/index';

type Json = Record<string, unknown>;

interface Route {
  path: string;
  title?: string;
  description?: string;
  image?: string;
  keywords?: string[];
  exactTitle?: boolean;
  type: 'website' | 'article' | 'profile';
  jsonLd: Json[];
}

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const API = (process.env.VITE_API_URL || '').replace(/\/$/, '');
const HOME = { name: 'Home', path: '/' };

const XML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};
const attr = (v: string): string =>
  v.replace(/[&<>"]/g, (c) => XML_ENTITIES[c] ?? c);

/** Never rejects — a missing endpoint just means that route group is skipped. */
async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Strips only the tags this script owns, so viewport, icons, fonts and the search-console token survive untouched. */
function stripManagedTags(html: string): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/gi, '')
    .replace(
      /<meta\s+name="(description|keywords|author|robots|twitter:[^"]*)"[^>]*>\s*/gi,
      ''
    )
    .replace(/<meta\s+property="(og|profile|article):[^"]*"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
    .replace(
      /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi,
      ''
    )
    .replace(/<!--\s*Open Graph[\s\S]*?-->\s*/gi, '')
    .replace(/<!--\s*Static Person\/WebSite[\s\S]*?-->\s*/gi, '');
}

function headFor(route: Route, settings?: SeoSettingsLike): string {
  const m = resolveSeo(route, settings);
  const tag = (t: string): string => `    ${t}`;
  const graph = {
    '@context': 'https://schema.org',
    '@graph': route.jsonLd.map(({ '@context': _c, ...node }) => node),
  };

  return [
    tag(`<title>${attr(m.fullTitle)}</title>`),
    tag(`<meta name="description" content="${attr(m.description)}" />`),
    tag(`<meta name="author" content="${attr(m.author)}" />`),
    tag(`<meta name="robots" content="${attr(m.robots)}" />`),
    tag(`<meta name="keywords" content="${attr(m.keywords)}" />`),
    tag(`<link rel="canonical" href="${attr(m.url)}" />`),
    tag(`<meta property="og:site_name" content="${attr(m.siteName)}" />`),
    tag(`<meta property="og:type" content="${route.type}" />`),
    tag(`<meta property="og:title" content="${attr(m.fullTitle)}" />`),
    tag(`<meta property="og:description" content="${attr(m.description)}" />`),
    tag(`<meta property="og:url" content="${attr(m.url)}" />`),
    tag(`<meta property="og:image" content="${attr(m.ogImage)}" />`),
    tag(`<meta property="og:image:alt" content="${attr(m.fullTitle)}" />`),
    tag(`<meta property="og:locale" content="en_US" />`),
    tag(`<meta name="twitter:card" content="summary_large_image" />`),
    ...(m.twitter
      ? [
          tag(`<meta name="twitter:site" content="${attr(m.twitter)}" />`),
          tag(`<meta name="twitter:creator" content="${attr(m.twitter)}" />`),
        ]
      : []),
    tag(`<meta name="twitter:title" content="${attr(m.fullTitle)}" />`),
    tag(`<meta name="twitter:description" content="${attr(m.description)}" />`),
    tag(`<meta name="twitter:image" content="${attr(m.ogImage)}" />`),
    tag(`<meta name="twitter:image:alt" content="${attr(m.fullTitle)}" />`),
    tag(
      `<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>`
    ),
  ].join('\n');
}

async function emit(
  template: string,
  route: Route,
  settings?: SeoSettingsLike
): Promise<void> {
  const html = stripManagedTags(template).replace(
    '</head>',
    `${headFor(route, settings)}\n  </head>`
  );
  const dir = route.path === '/' ? DIST : join(DIST, route.path);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), html, 'utf8');
}

async function main(): Promise<void> {
  if (!API) {
    console.warn('[prerender] VITE_API_URL is unset — skipping.');
    return;
  }

  const template = await readFile(join(DIST, 'index.html'), 'utf8');

  const [profileRes, seoRes, toolsRes, projectsRes, blogRes] =
    await Promise.all([
      get<{ data: ProfileDoc }>('/profile'),
      get<{ data: SeoSettingsDoc }>('/seo'),
      get<{ data: ToolDoc[] }>('/tools'),
      get<{ data: ProjectDoc[] }>('/projects'),
      get<{ data: BlogPostDoc[] }>('/blog?limit=100'),
    ]);

  // A record with no slug would resolve to its parent's path and silently overwrite that page's HTML.
  const slugged = <T extends { slug?: string }>(rows: T[]): T[] =>
    rows.filter((r) => Boolean(r.slug?.trim()));

  const profile = profileRes?.data;
  const settings = seoRes?.data;
  // Must run before any route is built: every canonical link and @id below is derived from it.
  setSiteOrigin(settings?.siteUrl);
  const tools = slugged(toolsRes?.data ?? []);
  const projects = slugged(projectsRes?.data ?? []);
  const posts = slugged(blogRes?.data ?? []);

  // Present on every route so each page carries the full identity graph, not just the home page.
  const identity = [personSchema(profile), websiteSchema()];

  const routes: Route[] = [
    {
      path: '/',
      description: profile?.tagline || undefined,
      image: profile?.avatar || undefined,
      type: 'profile',
      jsonLd: [...identity, profilePageSchema()],
    },
    {
      path: '/projects',
      ...PAGE_SEO.projects,
      type: 'website',
      jsonLd: [
        ...identity,
        breadcrumbSchema([HOME, { name: 'Projects', path: '/projects' }]),
        collectionPageSchema(
          'Projects',
          '/projects',
          projects.map((p) => ({ name: p.title, path: `/projects/${p.slug}` })),
          PAGE_SEO.projects.description
        ),
      ],
    },
    {
      path: '/blog',
      ...PAGE_SEO.blog,
      type: 'website',
      jsonLd: [
        ...identity,
        breadcrumbSchema([HOME, { name: 'Blog', path: '/blog' }]),
        collectionPageSchema(
          'Blog',
          '/blog',
          posts.map((p) => ({ name: p.title, path: `/blog/${p.slug}` })),
          PAGE_SEO.blog.description
        ),
      ],
    },
    {
      path: '/tools',
      ...PAGE_SEO.tools,
      keywords: [
        'free online tools',
        'browser tools no upload',
        ...tools.flatMap((t) => TOOL_SEO[t.key]?.keywords ?? []),
      ],
      type: 'website',
      jsonLd: [
        ...identity,
        breadcrumbSchema([HOME, { name: 'Tools', path: '/tools' }]),
        collectionPageSchema(
          'Free Online Tools',
          '/tools',
          [
            { name: 'Job Circular Finder', path: '/tools/jobs' },
            ...tools.map((t) => ({ name: t.name, path: `/tools/${t.slug}` })),
          ],
          PAGE_SEO.tools.description
        ),
      ],
    },
    {
      // The listings themselves expire nightly, so this route gets its page meta without a baked-in item list.
      path: '/tools/jobs',
      ...PAGE_SEO.jobs,
      type: 'website',
      jsonLd: [
        ...identity,
        breadcrumbSchema([
          HOME,
          { name: 'Tools', path: '/tools' },
          { name: PAGE_SEO.jobs.title, path: '/tools/jobs' },
        ]),
      ],
    },
    ...tools.map((t): Route => {
      const seo = TOOL_SEO[t.key] ?? fallbackToolSeo(t);
      return {
        path: `/tools/${t.slug}`,
        title: seo.title,
        description: seo.description,
        keywords: seo.keywords,
        exactTitle: true,
        type: 'website',
        jsonLd: [
          ...identity,
          breadcrumbSchema([
            HOME,
            { name: 'Tools', path: '/tools' },
            { name: t.name, path: `/tools/${t.slug}` },
          ]),
          softwareApplicationSchema({
            name: t.name,
            slug: t.slug,
            description: seo.description,
            category: t.category,
            features: seo.features,
          }),
        ],
      };
    }),
    ...projects.map(
      (p): Route => ({
        path: `/projects/${p.slug}`,
        title: p.title,
        description: p.summary || p.tagline,
        image: p.coverImage || undefined,
        keywords: p.techStack ?? [],
        type: 'website',
        jsonLd: [
          ...identity,
          breadcrumbSchema([
            HOME,
            { name: 'Projects', path: '/projects' },
            { name: p.title, path: `/projects/${p.slug}` },
          ]),
          projectSchema(p, profile?.name),
        ],
      })
    ),
    ...posts.map(
      (p): Route => ({
        path: `/blog/${p.slug}`,
        title: p.title,
        description: p.excerpt,
        image: p.coverImage || undefined,
        keywords: p.tags ?? [],
        type: 'article',
        jsonLd: [
          ...identity,
          breadcrumbSchema([
            HOME,
            { name: 'Blog', path: '/blog' },
            { name: p.title, path: `/blog/${p.slug}` },
          ]),
          articleSchema(p, profile?.name),
        ],
      })
    ),
  ];

  for (const route of routes) await emit(template, route, settings);
  console.log(`[prerender] wrote ${routes.length} route(s).`);
}

main().catch((err: unknown) => {
  console.warn('[prerender] skipped:', err);
});
