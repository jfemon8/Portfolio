/**
 * Reusable schema.org JSON-LD builders (project rule #3/#8). Pages compose
 * these and pass them to `<Seo jsonLd={...} />`, which keeps `Seo` purely
 * presentational and structured data consistent across every route.
 */
import {
  SITE_URL,
  AUTHOR_NAME,
  AUTHOR_JOB_TITLE,
  AUTHOR_ALTERNATE_NAMES,
  AUTHOR_HANDLE,
  AUTHOR_SAME_AS,
  AUTHOR_KNOWS_ABOUT,
  AUTHOR_EMPLOYER,
  AUTHOR_ALMA_MATER,
  AUTHOR_NATIONALITY,
  AUTHOR_CITY,
  SITE_TITLE,
  absoluteUrl,
} from '@/config/site';
import type { Profile, ProjectDoc, BlogPostDoc } from '@/types';

type Json = Record<string, unknown>;

/**
 * Stable node ids so the Person/WebSite/ProfilePage graphs (and the static
 * fallback copies in `index.html`) merge into ONE entity in Google's eyes —
 * the mechanism knowledge panels are built from.
 */
export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

const personRef = { '@id': PERSON_ID };

export const websiteSchema = (): Json => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: SITE_TITLE,
  alternateName: [AUTHOR_HANDLE, `${AUTHOR_NAME} Portfolio`],
  url: SITE_URL,
  inLanguage: 'en',
  publisher: personRef,
});

export const personSchema = (p?: Partial<Profile>): Json => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': PERSON_ID,
  name: p?.name || AUTHOR_NAME,
  alternateName: [...AUTHOR_ALTERNATE_NAMES],
  url: SITE_URL,
  jobTitle: p?.title || AUTHOR_JOB_TITLE,
  hasOccupation: {
    '@type': 'Occupation',
    name: p?.title || AUTHOR_JOB_TITLE,
    occupationLocation: { '@type': 'City', name: AUTHOR_CITY },
  },
  worksFor: { '@type': 'Organization', name: AUTHOR_EMPLOYER },
  alumniOf: { '@type': 'CollegeOrUniversity', name: AUTHOR_ALMA_MATER },
  nationality: { '@type': 'Country', name: AUTHOR_NATIONALITY },
  knowsAbout: [...AUTHOR_KNOWS_ABOUT],
  mainEntityOfPage: SITE_URL,
  ...(p?.avatar ? { image: p.avatar } : {}),
  ...(p?.email ? { email: `mailto:${p.email}` } : {}),
  ...(p?.location ? { address: p.location } : {}),
  sameAs: p?.socials?.length
    ? p.socials.map((s) => s.url).filter(Boolean)
    : [...AUTHOR_SAME_AS],
});

/**
 * Marks the home page as the person's canonical profile page (Google's
 * ProfilePage rich result) — mainEntity points at the Person node by @id.
 */
export const profilePageSchema = (): Json => ({
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  '@id': `${SITE_URL}/#profilepage`,
  url: SITE_URL,
  name: SITE_TITLE,
  inLanguage: 'en',
  isPartOf: { '@id': WEBSITE_ID },
  mainEntity: personRef,
  about: personRef,
});

/**
 * Marks a listing route (Projects/Blog) as a CollectionPage whose mainEntity
 * is an ItemList of the visible items — helps Google understand and surface
 * the child detail pages from the hub.
 */
export const collectionPageSchema = (
  name: string,
  path: string,
  items: { name: string; path: string }[],
  description?: string
): Json => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': `${absoluteUrl(path)}#collection`,
  name,
  url: absoluteUrl(path),
  ...(description ? { description } : {}),
  inLanguage: 'en',
  isPartOf: { '@id': WEBSITE_ID },
  about: personRef,
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: absoluteUrl(it.path),
    })),
  },
});

export const breadcrumbSchema = (
  items: { name: string; path: string }[]
): Json => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: absoluteUrl(it.path),
  })),
});

export const articleSchema = (
  post: BlogPostDoc,
  authorName?: string
): Json => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.title,
  description: post.excerpt,
  ...(post.coverImage ? { image: post.coverImage } : {}),
  datePublished: post.publishedAt || post.createdAt,
  dateModified: post.updatedAt,
  author: {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: authorName || AUTHOR_NAME,
    url: SITE_URL,
  },
  ...(post.tags?.length ? { keywords: post.tags.join(', ') } : {}),
  mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
});

export const projectSchema = (p: ProjectDoc, authorName?: string): Json => ({
  '@context': 'https://schema.org',
  '@type': 'CreativeWork',
  name: p.title,
  headline: p.title,
  description: p.summary || p.tagline,
  ...(p.coverImage ? { image: p.coverImage } : {}),
  dateModified: p.updatedAt,
  ...(p.techStack?.length ? { keywords: p.techStack.join(', ') } : {}),
  author: {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: authorName || AUTHOR_NAME,
    url: SITE_URL,
  },
  url: absoluteUrl(`/projects/${p.slug}`),
});
