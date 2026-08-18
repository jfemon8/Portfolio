// Resolves a page's final meta values from its props plus the admin SeoSettings; shared by the <Seo> component and the build-time prerender so the served HTML and the hydrated head never disagree.
import {
  AUTHOR_NAME,
  SITE_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  siteOrigin,
} from '@/config/site';

export interface SeoInput {
  title?: string;
  description?: string;
  /** Absolute URL or a path under the site origin. */
  image?: string;
  path?: string;
  noindex?: boolean;
  keywords?: string[];
  exactTitle?: boolean;
}

/** The admin-managed SeoSettings fields this resolver reads; structurally satisfied by SeoSettingsDoc. */
export interface SeoSettingsLike {
  authorName?: string;
  siteName?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  keywords?: string[];
  twitterHandle?: string;
}

export interface ResolvedSeo {
  author: string;
  siteName: string;
  fullTitle: string;
  description: string;
  url: string;
  ogImage: string;
  keywords: string;
  robots: string;
  twitter?: string;
}

export function resolveSeo(
  input: SeoInput,
  settings?: SeoSettingsLike
): ResolvedSeo {
  const author = settings?.authorName || AUTHOR_NAME;
  const siteName = settings?.siteName || SITE_TITLE;
  // Same resolver the structured-data @ids use, so canonical can never name a different origin than the entity graph.
  const origin = siteOrigin();
  const abs = (p = ''): string =>
    /^https?:\/\//.test(p) ? p : `${origin}${p.startsWith('/') ? p : `/${p}`}`;

  const siteKeywords = settings?.keywords?.length
    ? settings.keywords
    : DEFAULT_KEYWORDS;

  return {
    author,
    siteName,
    fullTitle: input.title
      ? input.exactTitle
        ? input.title
        : `${input.title} — ${author}`
      : settings?.metaTitle || siteName,
    description:
      input.description || settings?.metaDescription || DEFAULT_DESCRIPTION,
    url: abs(input.path ?? ''),
    ogImage: input.image
      ? abs(input.image)
      : settings?.ogImage || `${origin}/og.png`,
    // Page keywords lead, with the site-wide list kept behind them.
    keywords: [...new Set([...(input.keywords ?? []), ...siteKeywords])].join(
      ', '
    ),
    // max-image-preview:large lets Google show full-size image previews in search/Discover.
    robots: input.noindex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    twitter: settings?.twitterHandle?.trim() || undefined,
  };
}
