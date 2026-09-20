// Single source of truth for section keys, labels and order, read by Home, SettingsManager and the server's overrides, with Hero excluded as fixed and always first.
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
