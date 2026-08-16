import { prefetchProject, prefetchBlogPost } from '@/hooks/usePortfolio';

// Reuses the exact dynamic imports `App.tsx` lazy-loads so Vite shares one chunk; import() is module-cached, so repeat calls are free.
const importers = {
  projects: () => import('@/pages/Projects'),
  projectDetail: () => import('@/pages/ProjectDetail'),
  blog: () => import('@/pages/Blog'),
  blogPost: () => import('@/pages/BlogPostPage'),
  tools: () => import('@/pages/Tools'),
  jobs: () => import('@/pages/Jobs'),
  toolDetail: () => import('@/pages/ToolDetail'),
};

/** Warm the chunk (and, for detail pages, the data) a path will render. */
export function prefetchRoute(path: string): void {
  const projectSlug = /^\/projects\/([^/]+)/.exec(path)?.[1];
  const blogSlug = /^\/blog\/([^/]+)/.exec(path)?.[1];
  const toolSlug = /^\/tools\/([^/]+)/.exec(path)?.[1];

  if (projectSlug) {
    void importers.projectDetail();
    prefetchProject(projectSlug);
  } else if (path === '/projects') {
    void importers.projects();
  } else if (blogSlug) {
    void importers.blogPost();
    prefetchBlogPost(blogSlug);
  } else if (path === '/blog') {
    void importers.blog();
  } else if (path === '/tools/jobs') {
    void importers.jobs();
  } else if (toolSlug) {
    void importers.toolDetail();
  } else if (path === '/tools') {
    void importers.tools();
  }
}

type ChunkImporter = () => Promise<unknown>;

// All public-route chunks, warmed one at a time during idle time so a visitor's first navigation never hits a cold Suspense fallback.
const PUBLIC_ROUTE_IMPORTERS: ChunkImporter[] = [
  importers.projects,
  importers.projectDetail,
  importers.blog,
  importers.blogPost,
  importers.tools,
  importers.jobs,
  importers.toolDetail,
];

// Mirrors the admin lazy() list in App.tsx — only ever runs once an admin has already reached AdminLayout, so visitors never trigger it.
const ADMIN_ROUTE_IMPORTERS: ChunkImporter[] = [
  () => import('@/pages/admin/Dashboard'),
  () => import('@/pages/admin/ProfileManager'),
  () => import('@/pages/admin/ExperienceManager'),
  () => import('@/pages/admin/ProjectsManager'),
  () => import('@/pages/admin/SkillsManager'),
  () => import('@/pages/admin/EducationManager'),
  () => import('@/pages/admin/CredentialsManager'),
  () => import('@/pages/admin/BlogManager'),
  () => import('@/pages/admin/BlogEditor'),
  () => import('@/pages/admin/MessagesManager'),
  () => import('@/pages/admin/MediaLibrary'),
  () => import('@/pages/admin/AnalyticsManager'),
  () => import('@/pages/admin/UsersManager'),
  () => import('@/pages/admin/AuditLogViewer'),
  () => import('@/pages/admin/SiteCopyManager'),
  () => import('@/pages/admin/ToolsManager'),
  () => import('@/pages/admin/JobsManager'),
  () => import('@/pages/admin/SettingsManager'),
];

const schedule = (fn: () => void): void => {
  if ('requestIdleCallback' in window) requestIdleCallback(fn);
  else setTimeout(fn, 200);
};

// Chained through requestIdleCallback (one chunk per idle slice) rather than firing all at once, so it never competes with real interaction work.
function idlePrefetchAll(chunks: ChunkImporter[]): void {
  const saveData = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection?.saveData;
  if (saveData) return;

  let i = 0;
  const next = (): void => {
    const chunk = chunks[i++];
    if (!chunk) return;
    chunk()
      .catch(() => {})
      .finally(() => schedule(next));
  };
  schedule(next);
}

let publicRoutesWarmed = false;
/** Idle-warms every public route chunk once — call on mount from the public shell. */
export function prefetchPublicRoutes(): void {
  if (publicRoutesWarmed) return;
  publicRoutesWarmed = true;
  idlePrefetchAll(PUBLIC_ROUTE_IMPORTERS);
}

let adminRoutesWarmed = false;
/** Idle-warms every admin route chunk once — call on mount from AdminLayout (post-auth only). */
export function prefetchAdminRoutes(): void {
  if (adminRoutesWarmed) return;
  adminRoutesWarmed = true;
  idlePrefetchAll(ADMIN_ROUTE_IMPORTERS);
}
