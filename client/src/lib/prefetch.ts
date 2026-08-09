import { prefetchProject, prefetchBlogPost } from '@/hooks/usePortfolio';

// Reuses the exact dynamic imports `App.tsx` lazy-loads so Vite shares one chunk; import() is module-cached, so repeat calls are free.
const importers = {
  projects: () => import('@/pages/Projects'),
  projectDetail: () => import('@/pages/ProjectDetail'),
  blog: () => import('@/pages/Blog'),
  blogPost: () => import('@/pages/BlogPostPage'),
};

/** Warm the chunk (and, for detail pages, the data) a path will render. */
export function prefetchRoute(path: string): void {
  const projectSlug = /^\/projects\/([^/]+)/.exec(path)?.[1];
  const blogSlug = /^\/blog\/([^/]+)/.exec(path)?.[1];

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
  }
}
