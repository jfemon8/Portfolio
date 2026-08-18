import { env } from '../config/env.js';

// One resolver for every emitted URL: the admin's SeoSettings.siteUrl wins so a domain move needs no redeploy, with SITE_URL/CLIENT_URL as the fallback until it is set.
export const canonicalOrigin = (adminSiteUrl?: string): string => {
  const candidate = adminSiteUrl?.trim().replace(/\/$/, '');
  return candidate && /^https?:\/\//.test(candidate) ? candidate : env.siteUrl;
};
