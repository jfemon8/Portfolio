/**
 * Canonical homepage section catalogue — the SINGLE source of truth for
 * section keys, labels and default order (project rule #3/#8). `Home` maps
 * each key to its component; `SettingsManager` uses the labels for the
 * reorder/visibility UI; the server only stores order/visibility overrides.
 * Hero is intentionally excluded (it is the fixed identity, always first).
 */
export interface HomeSectionMeta {
  key: string;
  label: string;
}

export const HOME_SECTIONS: HomeSectionMeta[] = [
  { key: 'about', label: 'About' },
  { key: 'skills', label: 'Skills' },
  { key: 'cp', label: 'Competitive programming' },
  { key: 'projects', label: 'Featured projects' },
  { key: 'experience', label: 'Experience' },
  { key: 'education', label: 'Education' },
  { key: 'research', label: 'Research' },
  { key: 'credentials', label: 'Credentials' },
  { key: 'contact', label: 'Contact' },
];
