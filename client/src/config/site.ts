// SEO identity in one place; the canonical origin is resolved at runtime from the admin's SeoSettings.siteUrl so a domain change needs no code edit, with VITE_SITE_URL and the literal below as fallbacks until it loads.
const envSiteUrl: string | undefined =
  (import.meta.env as { VITE_SITE_URL?: string } | undefined)?.VITE_SITE_URL ??
  (typeof process !== 'undefined' ? process.env.VITE_SITE_URL : undefined);

const normalize = (url: string): string => url.trim().replace(/\/$/, '');

export const FALLBACK_SITE_URL = normalize(
  envSiteUrl || 'https://jfemon.vercel.app'
);

let adminOrigin: string | undefined;

/** Publishes the admin-configured origin; called once the SeoSettings query resolves, and by the prerender before it emits. */
export const setSiteOrigin = (url?: string): void => {
  const next = url ? normalize(url) : '';
  adminOrigin = /^https?:\/\//.test(next) ? next : undefined;
};

/** The one origin every canonical link, og:url and structured-data @id is built from. */
export const siteOrigin = (): string => adminOrigin ?? FALLBACK_SITE_URL;

export const AUTHOR_NAME = 'Md Jannatul Ferdhous Emon';

export const AUTHOR_JOB_TITLE = 'Assistant Front-End Developer';

// Name variants people search for — Person.alternateName and the default keywords read this one list; search is case-insensitive, so only distinct token patterns belong here, not casing variants.
export const AUTHOR_ALTERNATE_NAMES = [
  'Jannatul Ferdhous Emon',
  'Md Jannatul Ferdhous',
  'Md Jannatul Ferdhous Emon',
  'Jannatul Ferdhous',
  'Jannatul Emon',
  'Ferdhous Emon',
  'JF Emon',
  'J F Emon',
  'JFEmon',
  'jfemon',
  'jfemon8',
  'Emon',
  'Emon Khan',
] as const;

/** Primary public username/handle (og:profile, WebSite alternateName). */
export const AUTHOR_HANDLE = 'jfemon';

/** Public employment/education facts for the Person entity graph. */
export const AUTHOR_EMPLOYER = 'OnnoRokom Projukti Limited';
export const AUTHOR_ALMA_MATER = 'University of Barishal';
export const AUTHOR_NATIONALITY = 'Bangladesh';
export const AUTHOR_CITY = 'Dhaka';

// Fallback Person.sameAs profiles when the DB has none — Google uses these to build the knowledge-panel entity, so this must never be empty.
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

// Fallback keywords used only when admin SeoSettings has none: name variants, profession, stack terms, and location-qualified search terms.
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

// Static raster (not generated) because social scrapers don't execute JS; owner-supplied at client/public/og.png (1200×630), same pattern as avatar/resume placeholders.
export const defaultOgImage = (): string => `${siteOrigin()}/og.png`;

/** Resolve a route path or an already-absolute URL against the current canonical origin. */
export const absoluteUrl = (path = ''): string =>
  /^https?:\/\//.test(path)
    ? path
    : `${siteOrigin()}${path.startsWith('/') ? path : `/${path}`}`;
