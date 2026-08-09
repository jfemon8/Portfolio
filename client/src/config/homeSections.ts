// Single source of truth for section keys/labels/order: Home maps keys to components, SettingsManager uses labels for the reorder UI, server stores only overrides; Hero is excluded (fixed, always first).
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
