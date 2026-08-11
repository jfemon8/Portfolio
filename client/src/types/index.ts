// Frontend DTOs mirror the backend domain models — one consistent shape; ids/dates are serialized to strings.

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
  /** Legacy built-in icon key ('github'|'linkedin'|'mail'|'code'); new entries can leave empty and let display logic auto-derive from `label`. */
  icon: string;
  /** Optional Cloudinary URL — when set, overrides the auto-derived icon. */
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
  codeforcesHandle: string;
  leetcodeHandle: string;
  codechefHandle: string;
}

export interface CodeChefStats {
  handle: string;
  rating: number | null;
  highestRating: number | null;
  stars: number;
}

export interface LeetCodeStats {
  handle: string;
  totalSolved: number;
  easy: number;
  medium: number;
  hard: number;
  ranking: number | null;
  calendar: { date: string; count: number }[];
}

export interface CpStats {
  handle: string;
  rating: number | null;
  maxRating: number | null;
  rank: string;
  maxRank: string;
  contests: number;
  leetcode: LeetCodeStats | null;
  codechef: CodeChefStats | null;
  ratingHistory: { contest: string; rating: number; date: string }[];
  fetchedAt: string;
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

export interface Project {
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

/** Skill categories now live in /categories CRUD (see Category); this alias remains only so existing code can still import it as a type. */
export type SkillCategory = string;

export interface Skill {
  name: string;
  /** Slug ref into the Category collection (`Category.slug`). */
  category: SkillCategory;
  level: number;
  /** Legacy free-text icon hint, retained for older rows; new skills should use `iconImage` and let the public renderer fall back to a react-icons logo. */
  icon: string;
  /** Cloudinary-uploaded icon URL. Empty → react-icons fallback by name. */
  iconImage: string;
  iconImagePublicId: string;
  order: number;
  featured: boolean;
}

export type CategoryScope = 'skill' | 'tool';

export interface Category {
  name: string;
  slug: string;
  scope: CategoryScope;
  order: number;
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

/** Ties a Tool doc to its implementation under components/tools, resolved via toolRegistry.tsx. */
export type ToolKey =
  | 'jwt-decoder'
  | 'json-formatter'
  | 'regex-tester'
  | 'cp-profile-comparer'
  | 'cf-rating-predictor'
  | 'bigo-benchmark';

export type ToolIcon =
  | 'KeyRound'
  | 'Braces'
  | 'Regex'
  | 'GitCompare'
  | 'TrendingUp'
  | 'Wrench'
  | 'Terminal'
  | 'Sparkles'
  | 'Gauge';

export interface Tool {
  name: string;
  slug: string;
  description: string;
  category: string;
  icon: ToolIcon;
  key: ToolKey;
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
  mediaUrl: string;
  mediaPublicId: string;
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
  mediaUrl: string;
  mediaPublicId: string;
  abstract: string;
  order: number;
}

export type BlogStatus = 'draft' | 'scheduled' | 'published';

export type BlogReactionType = 'like' | 'love' | 'clap' | 'insightful' | 'fire';

export interface BlogReactionSummary {
  _id: BlogReactionType;
  count: number;
}

export interface BlogCommentReactionSummary {
  _id: BlogReactionType;
  count: number;
}

export interface BlogComment {
  post: string;
  name: string;
  email?: string;
  content: string;
  parentComment?: string;
  reactions?: BlogCommentReactionSummary[];
  totalReactions?: number;
  visitorReaction?: BlogReactionType | null;
  /** Only populated on top-level comments — the API nests each thread's replies (already newest-first) inline. */
  replies?: BlogCommentDoc[];
}

export interface BlogEngagement {
  reactions: BlogReactionSummary[];
  totalComments: number;
  totalReactions: number;
  visitorReaction: BlogReactionType | null;
}

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
  scheduledFor?: string;
}

export interface Message {
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  starred: boolean;
  archived: boolean;
  replied: boolean;
  repliedAt?: string;
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

/* ---- hydrated (with id + timestamps) ---- */
export type ProfileDoc = Entity<Profile>;
export type ExperienceDoc = Entity<Experience>;
export type ProjectDoc = Entity<Project>;
export type SkillDoc = Entity<Skill>;
export type CategoryDoc = Entity<Category>;
export type EducationDoc = Entity<Education>;
export type ToolDoc = Entity<Tool>;
export type CertificationDoc = Entity<Certification>;
export type PublicationDoc = Entity<Publication>;
export type BlogPostDoc = Entity<BlogPost>;
export type BlogCommentDoc = Entity<BlogComment>;
export type BlogReactionDoc = Entity<{
  post: string;
  visitorKey: string;
  reaction: BlogReactionType;
}>;
export type MessageDoc = Entity<Message>;
export type CpStatsDoc = Entity<CpStats>;
export type SeoSettingsDoc = Entity<SeoSettings>;
export type SiteSettingsDoc = Entity<SiteSettings>;
export type SiteContentDoc = Entity<SiteContent>;

/* ---- auth ---- */
export type UserRole = 'superAdmin' | 'admin' | 'visitor';
export type UserStatus = 'active' | 'disabled';

export interface User {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isImmutableSuperAdmin: boolean;
  avatar: string;
  lastLogin?: string;
}
export type UserDoc = Entity<User>;

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

export interface AuditLog {
  actor?: string;
  actorEmail: string;
  role: UserRole | 'anonymous';
  action: AuditAction;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  ip: string;
  userAgent: string;
}
export type AuditLogDoc = Entity<AuditLog>;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  isImmutableSuperAdmin?: boolean;
  avatar: string;
  lastLogin?: string;
}

export interface SeoSettings {
  siteName: string;
  authorName: string;
  siteUrl: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogImage: string;
  ogImagePublicId: string;
  twitterHandle: string;
}

export interface SiteSettings {
  heroBackground: string;
  sections: { key: string; visible: boolean }[];
}

export interface ContentSection {
  key: string;
  index: string;
  title: string;
  subtitle: string;
}

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

export interface AboutCopy {
  strengthsHeading: string;
  strengths: string[];
}

export interface FooterCopy {
  wordmark: string;
  linkProjects: string;
  linkBlog: string;
  linkAdmin: string;
  builtPrefix: string;
  builtSuffix: string;
}

export interface NavCopy {
  items: { key: string; label: string }[];
}

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
  headingHighlights: string;
  headingRelated: string;
  toastLinkCopied: string;
  toastCopyFailed: string;
  searchPlaceholder: string;
  searchAria: string;
}

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

export interface SiteContent {
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

export interface CloudinaryAsset {
  publicId: string;
  url: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
  createdAt: string;
}
export interface MediaListResponse {
  success: true;
  data: CloudinaryAsset[];
  nextCursor: string | null;
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
export type BlogCommentsPageResponse = PaginatedResponse<BlogCommentDoc>;
export interface BlogDetailResponse {
  success: true;
  data: BlogPostDoc;
  engagement: BlogEngagement;
  related: Pick<
    BlogPostDoc,
    | '_id'
    | 'title'
    | 'slug'
    | 'excerpt'
    | 'coverImage'
    | 'readingTime'
    | 'publishedAt'
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
  /** distinct cookie-less sessions in range */
  sessions: number;
  byDay: { date: string; views: number }[];
  byType: { _id: VisitType; count: number }[];
  byDevice: { _id: string; count: number }[];
  byBrowser: { _id: string; count: number }[];
  byCountry: { _id: string; count: number }[];
  /** scroll-depth funnel — _id is the 25/50/75/100 bucket */
  scrollDepth: { _id: number; count: number }[];
  topProjects: Pick<ProjectDoc, '_id' | 'title' | 'slug' | 'views'>[];
  topPosts: Pick<BlogPostDoc, '_id' | 'title' | 'slug' | 'views'>[];
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
