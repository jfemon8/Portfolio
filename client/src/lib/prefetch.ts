/**
 * Route-chunk prefetch (project rule #3/#5). These dynamic imports reference
 * the SAME modules `App.tsx` lazy-loads, so Vite serves one shared chunk —
 * warming it on navigation intent makes the click feel instant with no
 * duplicate bytes. import() is module-cached, so repeat calls are free.
 */
const importers = {
  projects: () => import('@/pages/Projects'),
  projectDetail: () => import('@/pages/ProjectDetail'),
  blog: () => import('@/pages/Blog'),
  blogPost: () => import('@/pages/BlogPostPage'),
};

/** Warm the chunk a given internal path will render. No-op for unknown paths. */
export function prefetchRoute(path: string): void {
  if (/^\/projects\/[^/]+/.test(path)) void importers.projectDetail();
  else if (path === '/projects') void importers.projects();
  else if (/^\/blog\/[^/]+/.test(path)) void importers.blogPost();
  else if (path === '/blog') void importers.blog();
}
