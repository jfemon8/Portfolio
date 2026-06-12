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
  iconImage?: string;
  iconImagePublicId?: string;
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
  /** Site identity — overrides the config/site fallbacks at runtime. */
  siteName: string;
  authorName: string;
  siteUrl: string;
}

/** Admin-managed homepage layout (singleton). */
export interface ISiteSettings {
  heroBackground: string;
  sections: { key: string; visible: boolean }[];
}

/** One section's editable heading copy (key = stable copy id, not layout). */
export interface ContentSection {
  key: string;
  index: string;
  title: string;
  subtitle: string;
}

/** Hero copy NOT sourced from Profile (badges, CTAs, terminal card). */
export interface HeroCopy {
  availableBadge: string;
  unavailableBadge: string;
  greeting: string;
  ctaProjects: string;
  ctaResume: string;
  ctaContact: string;
  scrollLabel: string;
  terminalTitle: string;
  whoamiCmd: string;
  stackCmd: string;
  stack: { label: string; value: string }[];
  goalsCmd: string;
  goalsText: string;
}

/** About "What I bring" strengths block. */
export interface AboutCopy {
  strengthsHeading: string;
  strengths: string[];
}

/** Footer wordmark, link labels and the "built with" line. */
export interface FooterCopy {
  wordmark: string;
  linkProjects: string;
  linkBlog: string;
  linkAdmin: string;
  builtPrefix: string;
  builtSuffix: string;
}

/** Floating-dock label overrides, keyed by the item's target. */
export interface NavCopy {
  items: { key: string; label: string }[];
}

/** Loading / error / empty / 404 state copy (+ per-page overrides). */
export interface StatesCopy {
  loading: string;
  error: string;
  retry: string;
  empty: string;
  notFoundError: string;
  notFoundHome: string;
  homeLoading: string;
  homeError: string;
  projectsEmpty: string;
  projectsFilterEmpty: string;
  postsEmpty: string;
  projectNotFound: string;
  postNotFound: string;
}

/** Admin login screen copy. */
export interface AuthCopy {
  panelTitle: string;
  panelSubtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailRequired: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  passwordRequired: string;
  signIn: string;
  signingIn: string;
  footer: string;
  welcomeToast: string;
  failToast: string;
}

/** Contact-form labels, placeholders, validation, toasts & info labels. */
export interface FormsCopy {
  nameLabel: string;
  namePlaceholder: string;
  nameRequired: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailRequired: string;
  emailInvalid: string;
  subjectLabel: string;
  subjectPlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  messageRequired: string;
  messageMin: string;
  send: string;
  sending: string;
  sentTitle: string;
  sentBody: string;
  sendAnother: string;
  sentToast: string;
  failToast: string;
  infoEmail: string;
  infoPhone: string;
  infoLocation: string;
}

/** Decorative / structural label microcopy (enum-keyed maps + UI chrome). */
export interface LabelsCopy {
  researchStages: string[];
  caseProblem: string;
  caseProcess: string;
  caseArchitecture: string;
  caseDatabase: string;
  caseApi: string;
  caseChallenges: string;
  caseSolutions: string;
  caseOptimization: string;
  caseLearnings: string;
  filterAll: string;
  filterFullstack: string;
  filterFrontend: string;
  filterBackend: string;
  catLanguage: string;
  catFramework: string;
  catDatabase: string;
  catTool: string;
  catCloud: string;
  catConcept: string;
  cpCurrentRating: string;
  cpMaxRating: string;
  cpContests: string;
  cpUnrated: string;
  cpCfProfile: string;
  cpRatingHistory: string;
  cpLeetcode: string;
  cpLcProfile: string;
  cpSolved: string;
  cpEasy: string;
  cpMedium: string;
  cpHard: string;
  cpSubmissionActivity: string;
  cpCodechef: string;
  cpHighest: string;
  cpCcProfile: string;
  btnBack: string;
  backToProjects: string;
  backToBlog: string;
  btnSourceCode: string;
  btnLiveDemo: string;
  btnCaseStudy: string;
  badgeFeatured: string;
  badgeVideo: string;
  btnShare: string;
  unitViews: string;
  unitMinRead: string;
  unitMin: string;
  headingHighlights: string;
  headingRelated: string;
  toastLinkCopied: string;
  toastCopyFailed: string;
  searchPlaceholder: string;
  searchAria: string;
}

/**
 * Contact-email copy (server-rendered in mailer.ts). Supports `{{name}}`,
 * `{{email}}`, `{{subject}}`, `{{message}}` tokens; each field falls back to
 * the current hardcoded template when empty.
 */
export interface EmailCopy {
  ownerSubjectPrefix: string;
  ownerHeading: string;
  ackFromName: string;
  ackSubject: string;
  ackHeading: string;
  ackGreeting: string;
  ackBody: string;
  ackSignoff: string;
}

/**
 * Admin-managed site copy / UI text (singleton, like SeoSettings). Grows per
 * P12 increment; every string also has a hardcoded component fallback so an
 * empty/missing doc renders the site identically.
 */
export interface ISiteContent {
  sections: ContentSection[];
  hero: HeroCopy;
  about: AboutCopy;
  footer: FooterCopy;
  nav: NavCopy;
  states: StatesCopy;
  forms: FormsCopy;
  auth: AuthCopy;
  labels: LabelsCopy;
  email: EmailCopy;
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

/** Skill categories are now a CRUD resource (see ICategory). `SkillCategory`
 *  remains as a string alias for backward-compat with code that imports it. */
export type SkillCategory = string;

export interface ISkill {
  name: string;
  /** Slug reference to a Category document (`ICategory.slug`). Not enforced
   *  as ObjectId so categories can be renamed/relabelled without breaking
   *  skill rows, and so legacy enum values keep working when their slugs
   *  match the seeded defaults. */
  category: SkillCategory;
  level: number;
  /** Legacy icon hint (free text — name or URL). Kept for backward-compat
   *  with previously-saved values; new entries should leave this empty and
   *  use `iconImage` (Cloudinary upload) + the react-icons fallback. */
  icon: string;
  /** Uploaded icon image URL (Cloudinary). When empty, the public renderer
   *  falls back to a react-icons logo matched by skill name. */
  iconImage: string;
  iconImagePublicId: string;
  order: number;
  featured: boolean;
}

/** Skill category, managed via /categories CRUD. `slug` is the stable id
 *  referenced by ISkill.category; `label` is the human-friendly display
 *  string shown in the public category tabs. */
export interface ICategory {
  name: string;
  slug: string;
  order: number;
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
