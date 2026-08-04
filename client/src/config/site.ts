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

export const AUTHOR_JOB_TITLE = 'Assistant Front-End Developer';

/**
 * Name variants people actually type into Google. Powers `Person.alternateName`
 * (entity/knowledge-panel SEO) and the default keywords meta — one list so the
 * two never drift.
 */
export const AUTHOR_ALTERNATE_NAMES = [
  'Jannatul Ferdhous Emon',
  'Md Jannatul Ferdhous',
  'Jannatul Ferdhous',
  'Jannatul Emon',
  'Ferdhous Emon',
  'JF Emon',
  'jfemon',
  'jfemon8',
  'Emon Khan',
] as const;

/** Primary public username/handle (og:profile, WebSite alternateName). */
export const AUTHOR_HANDLE = 'jfemon';

/** Public employment/education facts for the Person entity graph. */
export const AUTHOR_EMPLOYER = 'OnnoRokom Projukti Limited';
export const AUTHOR_ALMA_MATER = 'University of Barishal';
export const AUTHOR_NATIONALITY = 'Bangladesh';
export const AUTHOR_CITY = 'Dhaka';

/**
 * Canonical public profiles for `Person.sameAs` when the DB profile has no
 * socials yet — Google links these to build the entity behind a knowledge
 * panel, so the fallback must never be empty.
 */
export const AUTHOR_SAME_AS = [
  'https://github.com/jfemon8',
  'https://www.linkedin.com/in/jfemon/',
  'https://leetcode.com/u/jfemon8/',
  'https://codeforces.com/profile/EmonKhan',
  'https://www.codechef.com/users/jfemon',
] as const;

/** Topics for `Person.knowsAbout` — strengthens the entity's subject graph. */
export const AUTHOR_KNOWS_ABOUT = [
  'React',
  'Next.js',
  'Redux',
  'TypeScript',
  'JavaScript',
  'jQuery',
  'HTML',
  'CSS',
  'Tailwind CSS',
  'Node.js',
  'Express',
  'MongoDB',
  'MERN Stack',
  'ASP.NET Core',
  '.NET MVC',
  'C#',
  'SQL',
  'REST APIs',
  'Firebase',
  'Shopify',
  'Git',
  'Data Structures and Algorithms',
  'Object-Oriented Programming',
  'Responsive Web Design',
  'Web Performance Optimization',
  'Competitive Programming',
  'Front-End Development',
  'Full-Stack Development',
  'Software Engineering',
] as const;

export const SITE_TITLE = `${AUTHOR_NAME} — Developer Portfolio`;

export const DEFAULT_DESCRIPTION =
  'Assistant Front-End Developer Building Responsive, Dynamic MERN Applications.';

/**
 * Default keywords meta when the admin SeoSettings has none: every name
 * variant, the profession and adjacent professions, stack terms and
 * location-qualified variants people actually search with.
 */
export const DEFAULT_KEYWORDS = [
  AUTHOR_NAME,
  ...AUTHOR_ALTERNATE_NAMES,
  'Jannatul',
  'Ferdhous',
  'Emon',
  // Profession + related professions
  'Assistant Front-End Developer',
  'Front-End Developer',
  'Front-End Engineer',
  'Web Developer',
  'Software Engineer',
  'Full-Stack Developer',
  'MERN Stack Developer',
  'React Developer',
  'Next.js Developer',
  'TypeScript Developer',
  'JavaScript Developer',
  'Node.js Developer',
  '.NET Developer',
  'Shopify Developer',
  'UI Developer',
  'Web Application Developer',
  'Competitive Programmer',
  // Location-qualified
  'Front-End Developer Bangladesh',
  'React Developer Dhaka',
  'Web Developer Dhaka Bangladesh',
  'MERN Stack Developer Bangladesh',
  'Software Engineer Bangladesh',
  'Competitive Programmer Bangladesh',
  // Entity anchors
  `${AUTHOR_EMPLOYER} developer`,
  `${AUTHOR_ALMA_MATER} CSE`,
  'Codeforces EmonKhan',
  'CodeChef jfemon',
  'LeetCode jfemon8',
  'Developer Portfolio',
] as const;

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
