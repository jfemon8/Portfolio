import { useSiteContent } from './usePortfolio';

export interface SectionCopy {
  index: string;
  title: string;
  subtitle: string;
}

/**
 * Resolve a section's heading copy from the admin-managed SiteContent
 * singleton, falling back to the component's hardcoded defaults (project
 * rule #3/#8 — one accessor reused by every section). An empty or missing
 * value reverts to the default, so the site renders identically when nothing
 * is set and clearing a field in the admin restores the original copy —
 * zero-risk dynamic copy (same defensive merge as Seo over config/site).
 */
export function useSectionCopy(
  key: string,
  defaults: SectionCopy
): SectionCopy {
  const { data } = useSiteContent();
  const found = data?.data?.sections?.find((s) => s.key === key);
  return {
    index: found?.index || defaults.index,
    title: found?.title || defaults.title,
    subtitle: found?.subtitle || defaults.subtitle,
  };
}
