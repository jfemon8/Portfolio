import { Helmet } from 'react-helmet-async';
import {
  AUTHOR_NAME,
  AUTHOR_HANDLE,
  SITE_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  SITE_URL,
} from '@/config/site';
import { useSeoSettings } from '@/hooks/usePortfolio';

// Structured data comes in via `jsonLd` from @/lib/structuredData builders, keeping this component presentational.
interface SeoProps {
  title?: string;
  description?: string;
  /** Absolute URL or a path under the site origin; falls back to the OG image. */
  image?: string;
  /** Route path (for canonical + og:url). */
  path?: string;
  type?: 'website' | 'article' | 'profile';
  /** Utility/admin pages opt out of indexing. */
  noindex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export default function Seo({
  title,
  description,
  image,
  path = '',
  type = 'website',
  noindex = false,
  publishedTime,
  modifiedTime,
  tags,
  jsonLd,
}: SeoProps) {
  const { data: seoData } = useSeoSettings();
  const s = seoData?.data;
  const author = s?.authorName || AUTHOR_NAME;
  const siteName = s?.siteName || SITE_TITLE;
  const origin = (s?.siteUrl || SITE_URL).replace(/\/$/, '');
  const abs = (p = ''): string =>
    /^https?:\/\//.test(p)
      ? p
      : `${origin}${p.startsWith('/') ? p : `/${p}`}`;
  const fullTitle = title ? `${title} — ${author}` : s?.metaTitle || siteName;
  const desc = description || s?.metaDescription || DEFAULT_DESCRIPTION;
  const url = abs(path);
  const ogImage = image ? abs(image) : s?.ogImage || `${origin}/og.png`;
  const keywords = (s?.keywords?.length ? s.keywords : DEFAULT_KEYWORDS).join(
    ', '
  );
  const twitter = s?.twitterHandle?.trim();
  // max-image-preview:large lets Google show full-size image previews in search/Discover.
  const robots = noindex
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  const schemas = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta name="author" content={author} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={url} />
      {keywords && <meta name="keywords" content={keywords} />}

      <meta property="og:site_name" content={siteName} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={fullTitle} />
      <meta property="og:locale" content="en_US" />
      {type === 'profile' && (
        <meta property="profile:username" content={AUTHOR_HANDLE} />
      )}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === 'article' &&
        tags?.map((t) => (
          <meta key={t} property="article:tag" content={t} />
        ))}

      <meta name="twitter:card" content="summary_large_image" />
      {twitter && <meta name="twitter:site" content={twitter} />}
      {twitter && <meta name="twitter:creator" content={twitter} />}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={fullTitle} />

      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json">
          {/* Escapes '<' so admin-authored content (e.g. a title containing "</script>") can't break out of the script tag. */}
          {JSON.stringify(s).replace(/</g, '\\u003c')}
        </script>
      ))}
    </Helmet>
  );
}
