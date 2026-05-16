/**
 * Frontend DTOs — mirror the backend domain models so the whole app speaks
 * one consistent data structure (project rule #8). These represent the JSON
 * the API returns (ids/dates serialized to strings).
 */

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface WithId {
  _id: string;
}

export type Entity<T> = T & WithId & Timestamps;

/* ---- value objects ---- */
export interface Social {
  label: string;
  url: string;
  icon: string;
}
export interface Stat {
  label: string;
  value: string;
}
export interface LanguageProficiency {
  name: string;
  level: string;
}
export interface GalleryImage {
  url: string;
  publicId: string;
  caption: string;
}

/* ---- entities ---- */
export interface Profile {
  name: string;
  title: string;
  tagline: string;
  summary: string;
  roles: string[];
  location: string;
  email: string;
  phone: string;
  avatar: string;
  avatarPublicId: string;
  resumeUrl: string;
  resumePublicId: string;
  socials: Social[];
  stats: Stat[];
  languages: LanguageProficiency[];
  available: boolean;
}

export type EmploymentType =
  | 'full-time'
  | 'part-time'
  | 'internship'
  | 'contract'
  | 'freelance';

export interface Experience {
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  type: EmploymentType;
  highlights: string[];
  tech: string[];
  order: number;
}

export type ProjectCategory =
  | 'fullstack'
  | 'frontend'
  | 'backend'
  | 'mobile'
  | 'other';
export type ProjectStatus = 'completed' | 'in-progress' | 'archived';

export interface Project {
  title: string;
  slug: string;
  tagline: string;
  description: string;
  summary: string;
  techStack: string[];
  highlights: string[];
  category: ProjectCategory;
  coverImage: string;
  coverPublicId: string;
  gallery: GalleryImage[];
  sourceUrl: string;
  liveUrl: string;
  featured: boolean;
  status: ProjectStatus;
  year: string;
  order: number;
  views: number;
}

export type SkillCategory =
  | 'language'
  | 'framework'
  | 'database'
  | 'tool'
  | 'cloud'
  | 'concept'
  | 'other';

export interface Skill {
  name: string;
  category: SkillCategory;
  level: number;
  icon: string;
  order: number;
  featured: boolean;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  location: string;
  startYear: string;
  endYear: string;
  grade: string;
  description: string;
  order: number;
}

export type CredentialCategory =
  | 'certification'
  | 'publication'
  | 'achievement';

export interface Certification {
  title: string;
  issuer: string;
  issueDate: string;
  credentialUrl: string;
  category: CredentialCategory;
  description: string;
  order: number;
}

export interface Publication {
  title: string;
  venue: string;
  authors: string;
  year: string;
  url: string;
  abstract: string;
  order: number;
}

export type BlogStatus = 'draft' | 'published';

export interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  coverPublicId: string;
  tags: string[];
  category: string;
  readingTime: number;
  status: BlogStatus;
  featured: boolean;
  views: number;
  publishedAt?: string;
}

export interface Message {
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  starred: boolean;
  archived: boolean;
  ip: string;
  userAgent: string;
}

export type VisitType =
  | 'pageview'
  | 'project_click'
  | 'resume_download'
  | 'contact_submit'
  | 'social_click';

/* ---- hydrated (with id + timestamps) ---- */
export type ProfileDoc = Entity<Profile>;
export type ExperienceDoc = Entity<Experience>;
export type ProjectDoc = Entity<Project>;
export type SkillDoc = Entity<Skill>;
export type EducationDoc = Entity<Education>;
export type CertificationDoc = Entity<Certification>;
export type PublicationDoc = Entity<Publication>;
export type BlogPostDoc = Entity<BlogPost>;
export type MessageDoc = Entity<Message>;

/* ---- auth ---- */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin';
  avatar: string;
  lastLogin?: string;
}

/* ---- API envelopes ---- */
export interface ListResponse<T> {
  success: true;
  count?: number;
  unread?: number;
  data: T[];
}
export interface ItemResponse<T> {
  success: true;
  data: T;
}
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: Pagination;
}
export interface BlogDetailResponse {
  success: true;
  data: BlogPostDoc;
  related: Pick<
    BlogPostDoc,
    '_id' | 'title' | 'slug' | 'excerpt' | 'coverImage' | 'readingTime' | 'publishedAt'
  >[];
}
export interface AuthResponse {
  success: true;
  token: string;
  user: AuthUser;
}
export interface MeResponse {
  success: true;
  user: AuthUser;
}

/* ---- analytics ---- */
export interface AnalyticsSummary {
  range: { days: number; since: string };
  pageviews: { total: number; range: number };
  byDay: { date: string; views: number }[];
  byType: { _id: VisitType; count: number }[];
  byDevice: { _id: string; count: number }[];
  topProjects: (Pick<ProjectDoc, '_id' | 'title' | 'slug' | 'views'>)[];
  topPosts: (Pick<BlogPostDoc, '_id' | 'title' | 'slug' | 'views'>)[];
  counts: {
    projects: number;
    posts: number;
    messages: number;
    unread: number;
  };
}

/** Normalised axios error shape thrown by the API client. */
export interface ApiError {
  status?: number;
  message: string;
  details?: { field?: string; message: string }[];
}
