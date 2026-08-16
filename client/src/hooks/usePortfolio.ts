import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { getBlogVisitorKey } from '@/lib/blog';
import type {
  BlogCommentsPageResponse,
  BlogDetailResponse,
  BlogPostDoc,
  CpStatsDoc,
  CertificationDoc,
  EducationDoc,
  ExperienceDoc,
  ItemResponse,
  ListResponse,
  PaginatedResponse,
  ProfileDoc,
  ProjectDoc,
  SeoSettingsDoc,
  SiteSettingsDoc,
  SiteContentDoc,
  PublicationDoc,
  SkillDoc,
  CategoryDoc,
  ToolDoc,
  JobDetailResponse,
  JobListResponse,
} from '@/types';

const get = async <T>(url: string): Promise<T> => (await api.get<T>(url)).data;

// Portfolio content is admin-managed and rarely changes, so a 5-min staleTime cuts refetches; admin managers keep the global 60s default for fresher data.
const CONTENT = 5 * 60 * 1000;
// Kept well above staleTime so a page revisited within 30min still paints instantly from cache (then silently revalidates in the background) instead of blocking on a refetch.
const CONTENT_GC = 30 * 60 * 1000;

export const useProfile = () =>
  useQuery({
    queryKey: ['profile'],
    queryFn: () => get<ItemResponse<ProfileDoc>>('/profile'),
    staleTime: CONTENT,
    gcTime: CONTENT_GC,
  });

export const useSeoSettings = () =>
  useQuery({
    queryKey: ['seo'],
    queryFn: () => get<ItemResponse<SeoSettingsDoc>>('/seo'),
    staleTime: CONTENT,
    gcTime: CONTENT_GC,
  });

export const useSiteSettings = () =>
  useQuery({
    queryKey: ['site'],
    queryFn: () => get<ItemResponse<SiteSettingsDoc>>('/site'),
    staleTime: CONTENT,
    gcTime: CONTENT_GC,
  });

export const useSiteContent = () =>
  useQuery({
    queryKey: ['siteContent'],
    queryFn: () => get<ItemResponse<SiteContentDoc>>('/site-content'),
    staleTime: CONTENT,
    gcTime: CONTENT_GC,
  });

export const useProjects = (params = '') =>
  useQuery({
    queryKey: ['projects', params],
    queryFn: () => get<ListResponse<ProjectDoc>>(`/projects${params}`),
    staleTime: CONTENT,
    gcTime: CONTENT_GC,
  });

const projectQueryOptions = (slug: string) => ({
  queryKey: ['project', slug],
  queryFn: () => get<ItemResponse<ProjectDoc>>(`/projects/slug/${slug}`),
  staleTime: CONTENT,
  gcTime: CONTENT_GC,
});

export const useProject = (slug?: string) =>
  useQuery({ ...projectQueryOptions(slug ?? ''), enabled: !!slug });

/** Warms the project-detail query cache — pairs with prefetchRoute on hover/focus. */
export const prefetchProject = (slug: string): void => {
  void queryClient.prefetchQuery(projectQueryOptions(slug));
};

export const useExperience = () =>
  useQuery({
    queryKey: ['experience'],
    queryFn: () => get<ListResponse<ExperienceDoc>>('/experience'),
    staleTime: CONTENT,
    gcTime: CONTENT_GC,
  });

export const useSkills = () =>
  useQuery({
    queryKey: ['skills'],
    queryFn: () => get<ListResponse<SkillDoc>>('/skills'),
    staleTime: CONTENT,
    gcTime: CONTENT_GC,
  });

export const useCategories = (scope: 'skill' | 'tool' = 'skill') =>
  useQuery({
    queryKey: ['categories', scope],
    queryFn: () => get<ListResponse<CategoryDoc>>(`/categories?scope=${scope}`),
    staleTime: CONTENT,
    gcTime: CONTENT_GC,
  });

export const useEducation = () =>
  useQuery({
    queryKey: ['education'],
    queryFn: () => get<ListResponse<EducationDoc>>('/education'),
    staleTime: CONTENT,
    gcTime: CONTENT_GC,
  });

export const useCertifications = () =>
  useQuery({
    queryKey: ['certifications'],
    queryFn: () => get<ListResponse<CertificationDoc>>('/certifications'),
    staleTime: CONTENT,
    gcTime: CONTENT_GC,
  });

export const usePublications = () =>
  useQuery({
    queryKey: ['publications'],
    queryFn: () => get<ListResponse<PublicationDoc>>('/publications'),
    staleTime: CONTENT,
    gcTime: CONTENT_GC,
  });

export const useTools = () =>
  useQuery({
    queryKey: ['tools'],
    queryFn: () => get<ListResponse<ToolDoc>>('/tools'),
    staleTime: CONTENT,
    gcTime: CONTENT_GC,
  });

export interface JobQuery {
  category?: string;
  q?: string;
  region?: string;
  page?: number;
  limit?: number;
}

const jobSearchParams = (query: JobQuery): string => {
  const params = new URLSearchParams();
  if (query.category && query.category !== 'all')
    params.set('category', query.category);
  if (query.q?.trim()) params.set('q', query.q.trim());
  if (query.region && query.region !== 'all')
    params.set('region', query.region);
  if (query.page && query.page > 1) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  const search = params.toString();
  return search ? `?${search}` : '';
};

/** Paged board query — page 1 also carries the facet counts, and `keepPreviousData` keeps the current results on screen while a new filter loads. */
export const useJobsInfinite = (query: JobQuery = {}) => {
  const base = jobSearchParams(query);
  return useInfiniteQuery({
    queryKey: ['jobs', 'list', base],
    queryFn: ({ pageParam }) =>
      get<JobListResponse>(
        `/jobs${base ? `${base}&` : '?'}page=${String(pageParam)}`
      ),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.pages
        ? last.pagination.page + 1
        : undefined,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    gcTime: CONTENT_GC,
  });
};

export const useJob = (id?: string) =>
  useQuery({
    queryKey: ['job', id],
    queryFn: () => get<JobDetailResponse>(`/jobs/${id}`),
    enabled: Boolean(id),
    // Expiry is date-driven, so a stale cache entry can misrepresent an open job.
    staleTime: 60 * 1000,
    gcTime: CONTENT_GC,
    retry: (count, error) =>
      (error as { status?: number })?.status === 410 ? false : count < 2,
  });

/** Consumes the server `pagination` metadata so posts beyond the first page stay reachable via `fetchNextPage`. */
export const useBlogInfinite = (query = '') =>
  useInfiniteQuery({
    queryKey: ['blog', 'list', query],
    queryFn: ({ pageParam }) => {
      const qs = new URLSearchParams();
      if (query) qs.set('q', query);
      qs.set('page', String(pageParam));
      return get<PaginatedResponse<BlogPostDoc>>(`/blog?${qs.toString()}`);
    },
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.pages
        ? last.pagination.page + 1
        : undefined,
    staleTime: CONTENT,
    gcTime: CONTENT_GC,
  });

const blogPostQueryOptions = (slug: string, visitorKey?: string) => ({
  queryKey: ['blog', 'post', slug, visitorKey],
  queryFn: () => {
    const qs = new URLSearchParams();
    if (visitorKey) qs.set('visitorKey', visitorKey);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return get<BlogDetailResponse>(`/blog/slug/${slug}${suffix}`);
  },
  staleTime: CONTENT,
  gcTime: CONTENT_GC,
});

export const useBlogPost = (slug?: string, visitorKey?: string) =>
  useQuery({
    ...blogPostQueryOptions(slug ?? '', visitorKey),
    enabled: !!slug,
  });

/** Warms the blog-post query cache with the same visitorKey the real page will use. */
export const prefetchBlogPost = (slug: string): void => {
  void queryClient.prefetchQuery(
    blogPostQueryOptions(slug, getBlogVisitorKey(slug))
  );
};

// A post's comments can run into the thousands, so they load 20 at a time and accumulate as the user scrolls, instead of shipping the whole list up front.
export const usePostCommentsInfinite = (
  slug: string,
  visitorKey?: string,
  limit = 20
) =>
  useInfiniteQuery({
    queryKey: ['blog', 'comments', slug, limit, visitorKey],
    queryFn: ({ pageParam }) => {
      const qs = new URLSearchParams({
        page: String(pageParam),
        limit: String(limit),
      });
      if (visitorKey) qs.set('visitorKey', visitorKey);
      return get<BlogCommentsPageResponse>(
        `/blog/slug/${slug}/comments?${qs.toString()}`
      );
    },
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.pages
        ? last.pagination.page + 1
        : undefined,
    enabled: !!slug,
  });

export const useCpStats = () =>
  useQuery({
    queryKey: ['cp'],
    queryFn: () => get<ItemResponse<CpStatsDoc>>('/cp'),
    retry: false,
    // server caches 6h; no need to refetch client-side often
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
