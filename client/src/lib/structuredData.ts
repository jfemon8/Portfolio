// Reusable schema.org JSON-LD builders; pages compose these and pass them to <Seo jsonLd={...} />, keeping Seo purely presentational.
import {
  siteOrigin,
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
  DEFAULT_DESCRIPTION,
  absoluteUrl,
} from '@/config/site';
import { detectLanguage } from './detectLanguage';
import type { Profile, ProjectDoc, BlogPostDoc } from '@/types';

type Json = Record<string, unknown>;

// Shared node ids so the Person/WebSite/ProfilePage graphs (and the static copies in index.html) merge into ONE entity — the mechanism knowledge panels are built from.
// Functions, not constants: they must track the same origin as the canonical link, which is only known once SeoSettings has loaded.
export const personId = (): string => `${siteOrigin()}/#person`;
export const websiteId = (): string => `${siteOrigin()}/#website`;

const personRef = (): Json => ({ '@id': personId() });

export const websiteSchema = (): Json => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': websiteId(),
  name: SITE_TITLE,
  alternateName: [AUTHOR_HANDLE, `${AUTHOR_NAME} Portfolio`],
  url: siteOrigin(),
  inLanguage: 'en',
  publisher: personRef(),
  // Declares the on-site blog search so Google can offer a sitelinks searchbox; /blog reads the same `q` param.
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${siteOrigin()}/blog?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
});

export const personSchema = (p?: Partial<Profile>): Json => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': personId(),
  name: p?.name || AUTHOR_NAME,
  alternateName: [...AUTHOR_ALTERNATE_NAMES],
  url: siteOrigin(),
  description: p?.tagline || DEFAULT_DESCRIPTION,
  knowsLanguage: ['en', 'bn'],
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
  mainEntityOfPage: siteOrigin(),
  ...(p?.avatar
    ? {
        image: {
          '@type': 'ImageObject',
          url: p.avatar,
          caption: p.name || AUTHOR_NAME,
        },
      }
    : {}),
  ...(p?.email ? { email: `mailto:${p.email}` } : {}),
  ...(p?.location ? { address: p.location } : {}),
  // Merged, not replaced: the hardcoded profiles are the entity anchors Google resolves the identity from, so a short admin list must never drop them.
  sameAs: [
    ...new Set([
      ...(p?.socials ?? []).map((s) => s.url).filter(Boolean),
      ...AUTHOR_SAME_AS,
    ]),
  ],
});

// Marks the home page as the canonical ProfilePage rich result; mainEntity points at the Person node by @id.
export const profilePageSchema = (): Json => ({
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  '@id': `${siteOrigin()}/#profilepage`,
  url: siteOrigin(),
  name: SITE_TITLE,
  inLanguage: 'en',
  isPartOf: { '@id': websiteId() },
  mainEntity: personRef(),
  about: personRef(),
});

// Marks a listing route as a CollectionPage with an ItemList mainEntity, helping Google surface child detail pages from the hub.
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
  isPartOf: { '@id': websiteId() },
  about: personRef(),
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
    '@id': personId(),
    name: authorName || AUTHOR_NAME,
    url: siteOrigin(),
  },
  ...(post.tags?.length ? { keywords: post.tags.join(', ') } : {}),
  publisher: personRef(),
  // This blog mixes Bengali and English posts — the site-wide "en" default is wrong often enough to detect per post.
  inLanguage: detectLanguage(`${post.title} ${post.excerpt}`),
  isPartOf: { '@id': websiteId() },
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
    '@id': personId(),
    name: authorName || AUTHOR_NAME,
    url: siteOrigin(),
  },
  url: absoluteUrl(`/projects/${p.slug}`),
  inLanguage: 'en',
  isPartOf: { '@id': websiteId() },
  about: personRef(),
});

/** Marks a tool page as free software, which is what earns the "Free" and app-style treatment in results. */
export const softwareApplicationSchema = (tool: {
  name: string;
  slug: string;
  description: string;
  category: string;
  features?: string[];
}): Json => ({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  '@id': `${absoluteUrl(`/tools/${tool.slug}`)}#app`,
  name: tool.name,
  url: absoluteUrl(`/tools/${tool.slug}`),
  description: tool.description,
  applicationCategory: 'UtilitiesApplication',
  applicationSubCategory: tool.category,
  // Runs entirely in the browser, which is a genuine differentiator worth declaring.
  operatingSystem: 'Any',
  browserRequirements:
    'Requires JavaScript. Works in Chrome, Edge, Firefox and Safari.',
  isAccessibleForFree: true,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  ...(tool.features?.length ? { featureList: tool.features } : {}),
  inLanguage: 'en',
  isPartOf: { '@id': websiteId() },
  author: personRef(),
  publisher: personRef(),
});
