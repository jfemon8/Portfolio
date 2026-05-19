/**
 * Reusable schema.org JSON-LD builders (project rule #3/#8). Pages compose
 * these and pass them to `<Seo jsonLd={...} />`, which keeps `Seo` purely
 * presentational and structured data consistent across every route.
 */
import { SITE_URL, AUTHOR_NAME, SITE_TITLE, absoluteUrl } from '@/config/site';
import type { Profile, ProjectDoc, BlogPostDoc } from '@/types';

type Json = Record<string, unknown>;

export const websiteSchema = (): Json => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_TITLE,
  url: SITE_URL,
});

export const personSchema = (p?: Partial<Profile>): Json => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: p?.name || AUTHOR_NAME,
  url: SITE_URL,
  ...(p?.title ? { jobTitle: p.title } : {}),
  ...(p?.avatar ? { image: p.avatar } : {}),
  ...(p?.email ? { email: `mailto:${p.email}` } : {}),
  ...(p?.location ? { address: p.location } : {}),
  ...(p?.socials?.length
    ? { sameAs: p.socials.map((s) => s.url).filter(Boolean) }
    : {}),
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
  author: { '@type': 'Person', name: authorName || AUTHOR_NAME, url: SITE_URL },
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
  author: { '@type': 'Person', name: authorName || AUTHOR_NAME, url: SITE_URL },
  url: absoluteUrl(`/projects/${p.slug}`),
});
