/**
 * Single source of truth for site-level SEO identity (project rule #3/#8).
 * Both the `Seo` component and the structured-data builders read from here
 * so titles, canonical origin and social/JSON-LD identity never drift.
 *
 * `VITE_SITE_URL` is a PUBLIC value (the deployed site origin) — safe in the
 * bundle; no secrets here (rule #9).
 */
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || 'https://jfemon.vercel.app'
).replace(/\/$/, '');

export const AUTHOR_NAME = 'Md Jannatul Ferdhous Emon';

export const SITE_TITLE = `${AUTHOR_NAME} — Developer Portfolio`;

export const DEFAULT_DESCRIPTION =
  'Assistant Front-End Developer building responsive, dynamic MERN applications.';

/**
 * Default social-share image. Social scrapers don't execute JS, so this is a
 * static raster the owner supplies at `client/public/og.png` (1200×630) —
 * same "owner-supplied media" pattern as the avatar/resume placeholders.
 */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og.png`;

/** Resolve a route path or an already-absolute URL to an absolute URL. */
export const absoluteUrl = (path = ''): string =>
  /^https?:\/\//.test(path)
    ? path
    : `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
