/**
 * Shared domain types. The Mongoose models implement these interfaces so the
 * whole backend (and, mirrored, the frontend) speaks one data structure.
 */
import type { Types } from 'mongoose';

export type ID = Types.ObjectId;

export type UserRole = 'superAdmin' | 'admin' | 'visitor';
export type UserStatus = 'active' | 'disabled';

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  /** true for the hardcoded super admins — role/status/deletion locked */
  isImmutableSuperAdmin: boolean;
  avatar: string;
  lastLogin?: Date;
}

/** Persisted, hashed refresh token (rotation + reuse detection). */
export interface IRefreshToken {
  user: ID;
  tokenHash: string;
  /** rotation family — a reused token revokes the whole family */
  family: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByHash?: string;
  ip: string;
  userAgent: string;
}

export type AuditAction =
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.refresh'
  | 'auth.refresh_reuse_detected'
  | 'auth.logout'
  | 'auth.password_changed'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'rbac.denied';

export interface IAuditLog {
  actor?: ID;
  actorEmail: string;
  role: UserRole | 'anonymous';
  action: AuditAction;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  ip: string;
  userAgent: string;
}

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

export interface IProfile {
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
  codeforcesHandle: string;
  leetcodeHandle: string;
  codechefHandle: string;
}

/** LeetCode solved/ranking snapshot (optional, nested in ICpStats). */
export interface ILeetCodeStats {
  handle: string;
  totalSolved: number;
  easy: number;
  medium: number;
  hard: number;
  ranking: number | null;
  calendar: { date: string; count: number }[];
}

/** CodeChef snapshot (optional, nested in ICpStats; best-effort). */
export interface ICodeChefStats {
  handle: string;
  rating: number | null;
  highestRating: number | null;
  stars: number;
}

/** Cached CP snapshot (Codeforces + optional LeetCode/CodeChef). */
export interface ICpStats {
  handle: string;
  rating: number | null;
  maxRating: number | null;
  rank: string;
  maxRank: string;
  contests: number;
  leetcode: ILeetCodeStats | null;
  codechef: ICodeChefStats | null;
  ratingHistory: { contest: string; rating: number; date: string }[];
  fetchedAt: Date;
}

/** Admin-managed site SEO defaults (singleton). */
export interface ISeoSettings {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogImage: string;
  ogImagePublicId: string;
  twitterHandle: string;
}

/** Admin-managed homepage layout (singleton). */
export interface ISiteSettings {
  heroBackground: string;
  sections: { key: string; visible: boolean }[];
}

export type EmploymentType =
  | 'full-time'
  | 'part-time'
  | 'internship'
  | 'contract'
  | 'freelance';

export interface IExperience {
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

export interface GalleryImage {
  url: string;
  publicId: string;
  caption: string;
}

/** Structured case study (all optional Markdown). Empty → page falls back
 *  to `description` for backward compatibility. */
export interface CaseStudy {
  problem: string;
  process: string;
  architecture: string;
  database: string;
  api: string;
  challenges: string;
  solutions: string;
  optimization: string;
  learnings: string;
}

export interface IProject {
  title: string;
  slug: string;
  tagline: string;
  description: string;
  caseStudy: CaseStudy;
  summary: string;
  techStack: string[];
  highlights: string[];
  category: ProjectCategory;
  coverImage: string;
  coverPublicId: string;
  gallery: GalleryImage[];
  sourceUrl: string;
  liveUrl: string;
  videoUrl: string;
  metrics: Stat[];
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

export interface ISkill {
  name: string;
  category: SkillCategory;
  level: number;
  icon: string;
  order: number;
  featured: boolean;
}

export interface IEducation {
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

export interface ICertification {
  title: string;
  issuer: string;
  issueDate: string;
  credentialUrl: string;
  category: CredentialCategory;
  description: string;
  order: number;
}

export interface IPublication {
  title: string;
  venue: string;
  authors: string;
  year: string;
  url: string;
  abstract: string;
  order: number;
}

export type BlogStatus = 'draft' | 'scheduled' | 'published';

export interface IBlogPost {
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
  publishedAt?: Date;
  /** when status === 'scheduled', the post becomes public at this time */
  scheduledFor?: Date;
}

export interface IMessage {
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
  | 'social_click'
  | 'scroll_depth';

export interface IVisit {
  type: VisitType;
  path: string;
  ref: string;
  referrer: string;
  device: string;
  /** UA-derived browser family (privacy-friendly — no fingerprinting). */
  browser: string;
  /** Vercel-native 2-letter country code; '' when unavailable (local/dev). */
  country: string;
  /** Opaque cookie-less session id (ephemeral, sessionStorage — not a cookie). */
  sid: string;
  /** Max scroll-depth percentage for `scroll_depth` events (0–100). */
  depth: number;
  day: string;
}

/** Standard success/error envelope used by every endpoint. */
export interface ApiSuccess<T = unknown> {
  success: true;
  data?: T;
  [key: string]: unknown;
}

export interface JwtPayload {
  id: string;
  role: UserRole;
  email: string;
  /** distinguishes access vs (future) typed tokens */
  type: 'access';
}
