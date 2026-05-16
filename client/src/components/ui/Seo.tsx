import { Helmet } from 'react-helmet-async';

const SITE = import.meta.env.VITE_SITE_URL || 'http://localhost:5173';

interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  path?: string;
}

export default function Seo({
  title,
  description = 'Assistant Front-End Developer building responsive, dynamic MERN applications.',
  image,
  path = '',
}: SeoProps) {
  const fullTitle = title
    ? `${title} — Md Jannatul Ferdhous Emon`
    : 'Md Jannatul Ferdhous Emon — Developer Portfolio';
  const url = `${SITE}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
