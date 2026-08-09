import { useSiteContent } from './usePortfolio';

type CopyGroup =
  | 'hero'
  | 'about'
  | 'footer'
  | 'nav'
  | 'states'
  | 'forms'
  | 'auth'
  | 'labels';

const isEmpty = (v: unknown): boolean =>
  v == null ||
  (typeof v === 'string' && v.trim() === '') ||
  (Array.isArray(v) && v.length === 0);

// Resolves an admin-managed SiteContent group over hardcoded defaults — empty/missing fields fall back to the default, so clearing a field restores the original; same contract as useSectionCopy.
export function useSiteCopy<T extends Record<string, unknown>>(
  group: CopyGroup,
  defaults: T
): T {
  const { data } = useSiteContent();
  const stored = data?.data?.[group] as unknown as Partial<T> | undefined;
  if (!stored) return defaults;
  const out: T = { ...defaults };
  (Object.keys(defaults) as (keyof T)[]).forEach((k) => {
    const v = stored[k];
    if (!isEmpty(v)) out[k] = v as T[keyof T];
  });
  return out;
}
