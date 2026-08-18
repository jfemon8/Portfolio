import { Helmet } from 'react-helmet-async';
import { AUTHOR_HANDLE } from '@/config/site';
import { resolveSeo } from '@/lib/seoMeta';
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
  /** Page-specific keywords; they lead, with the site-wide list kept behind them. */
  keywords?: string[];
  /** Uses the title verbatim, for pages whose title is already at the length a result snippet allows. */
  exactTitle?: boolean;
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
  keywords,
  exactTitle = false,
  jsonLd,
}: SeoProps) {
  const { data: seoData } = useSeoSettings();
  const m = resolveSeo(
    { title, description, image, path, noindex, keywords, exactTitle },
    seoData?.data
  );
  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{m.fullTitle}</title>
      <meta name="description" content={m.description} />
      <meta name="author" content={m.author} />
      <meta name="robots" content={m.robots} />
      <link rel="canonical" href={m.url} />
      {m.keywords && <meta name="keywords" content={m.keywords} />}

      <meta property="og:site_name" content={m.siteName} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={m.fullTitle} />
      <meta property="og:description" content={m.description} />
      <meta property="og:url" content={m.url} />
      <meta property="og:image" content={m.ogImage} />
      <meta property="og:image:alt" content={m.fullTitle} />
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
        tags?.map((t) => <meta key={t} property="article:tag" content={t} />)}

      <meta name="twitter:card" content="summary_large_image" />
      {m.twitter && <meta name="twitter:site" content={m.twitter} />}
      {m.twitter && <meta name="twitter:creator" content={m.twitter} />}
      <meta name="twitter:title" content={m.fullTitle} />
      <meta name="twitter:description" content={m.description} />
      <meta name="twitter:image" content={m.ogImage} />
      <meta name="twitter:image:alt" content={m.fullTitle} />

      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json">
          {/* Escapes '<' so admin-authored content (e.g. a title containing "</script>") can't break out of the script tag. */}
          {JSON.stringify(s).replace(/</g, '\\u003c')}
        </script>
      ))}
    </Helmet>
  );
}
