import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
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
} from '@/types';

const get = async <T>(url: string): Promise<T> => (await api.get<T>(url)).data;

/**
 * Tiered cache (P10.1): portfolio content is admin-managed and changes
 * rarely, so a 5-min freshness window cuts redundant refetches/jank. The
 * global 60s default still applies to the admin managers' own queries,
 * keeping their data fresher.
 */
const CONTENT = 5 * 60 * 1000;

export const useProfile = () =>
  useQuery({
    queryKey: ['profile'],
    queryFn: () => get<ItemResponse<ProfileDoc>>('/profile'),
    staleTime: CONTENT,
  });

export const useSeoSettings = () =>
  useQuery({
    queryKey: ['seo'],
    queryFn: () => get<ItemResponse<SeoSettingsDoc>>('/seo'),
    staleTime: CONTENT,
  });

export const useSiteSettings = () =>
  useQuery({
    queryKey: ['site'],
    queryFn: () => get<ItemResponse<SiteSettingsDoc>>('/site'),
    staleTime: CONTENT,
  });

export const useSiteContent = () =>
  useQuery({
    queryKey: ['siteContent'],
    queryFn: () => get<ItemResponse<SiteContentDoc>>('/site-content'),
    staleTime: CONTENT,
  });

export const useProjects = (params = '') =>
  useQuery({
    queryKey: ['projects', params],
    queryFn: () => get<ListResponse<ProjectDoc>>(`/projects${params}`),
    staleTime: CONTENT,
  });

export const useProject = (slug?: string) =>
  useQuery({
    queryKey: ['project', slug],
    queryFn: () => get<ItemResponse<ProjectDoc>>(`/projects/slug/${slug}`),
    enabled: !!slug,
    staleTime: CONTENT,
  });

export const useExperience = () =>
  useQuery({
    queryKey: ['experience'],
    queryFn: () => get<ListResponse<ExperienceDoc>>('/experience'),
    staleTime: CONTENT,
  });

export const useSkills = () =>
  useQuery({
    queryKey: ['skills'],
    queryFn: () => get<ListResponse<SkillDoc>>('/skills'),
    staleTime: CONTENT,
  });

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: () => get<ListResponse<CategoryDoc>>('/categories'),
    staleTime: CONTENT,
  });

export const useEducation = () =>
  useQuery({
    queryKey: ['education'],
    queryFn: () => get<ListResponse<EducationDoc>>('/education'),
    staleTime: CONTENT,
  });

export const useCertifications = () =>
  useQuery({
    queryKey: ['certifications'],
    queryFn: () => get<ListResponse<CertificationDoc>>('/certifications'),
    staleTime: CONTENT,
  });

export const usePublications = () =>
  useQuery({
    queryKey: ['publications'],
    queryFn: () => get<ListResponse<PublicationDoc>>('/publications'),
    staleTime: CONTENT,
  });

/**
 * Paginated public blog list. Consumes the server `pagination` metadata so
 * posts beyond the first page stay reachable (via `fetchNextPage`). `query`
 * is the raw search term (encoded here).
 */
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
  });

export const useBlogPost = (slug?: string, visitorKey?: string) =>
  useQuery({
    queryKey: ['blog', 'post', slug, visitorKey],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (visitorKey) qs.set('visitorKey', visitorKey);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      return get<BlogDetailResponse>(`/blog/slug/${slug}${suffix}`);
    },
    enabled: !!slug,
    staleTime: CONTENT,
  });

export const useCpStats = () =>
  useQuery({
    queryKey: ['cp'],
    queryFn: () => get<ItemResponse<CpStatsDoc>>('/cp'),
    retry: false,
    // server caches 6h; no need to refetch client-side often
    staleTime: 30 * 60 * 1000,
  });
