import { Helmet } from 'react-helmet-async';
import {
  AUTHOR_NAME,
  SITE_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  absoluteUrl,
} from '@/config/site';
import { useSeoSettings } from '@/hooks/usePortfolio';

/**
 * Single, reusable SEO head manager (project rule #3/#8). Every route renders
 * one `<Seo />`; structured data is supplied via `jsonLd` from the reusable
 * builders in `@/lib/structuredData` so this component stays presentational.
 *
 * Backward-compatible: the original title/description/image/path props are
 * unchanged; type, noindex, the article fields and jsonLd are additive.
 */
interface SeoProps {
  title?: string;
  description?: string;
  /** Absolute URL or a path under the site origin; falls back to the OG image. */
  image?: string;
  /** Route path (for canonical + og:url). */
  path?: string;
  type?: 'website' | 'article';
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
  const fullTitle = title
    ? `${title} — ${AUTHOR_NAME}`
    : s?.metaTitle || SITE_TITLE;
  const desc = description || s?.metaDescription || DEFAULT_DESCRIPTION;
  const url = absoluteUrl(path);
  const ogImage = image ? absoluteUrl(image) : s?.ogImage || DEFAULT_OG_IMAGE;
  const keywords = s?.keywords?.length ? s.keywords.join(', ') : '';
  const twitter = s?.twitterHandle?.trim();
  const robots = noindex ? 'noindex, nofollow' : 'index, follow';
  const schemas = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={url} />
      {keywords && <meta name="keywords" content={keywords} />}

      <meta property="og:site_name" content={AUTHOR_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="en_US" />
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

      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(s)}
        </script>
      ))}
    </Helmet>
  );
}
