import { useSiteContent } from './usePortfolio';

export interface SectionCopy {
  index: string;
  title: string;
  subtitle: string;
}

// Resolves section heading copy from the admin SiteContent singleton, falling back to hardcoded defaults — clearing a field in admin restores the original.
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
