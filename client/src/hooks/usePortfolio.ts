import { useQuery } from '@tanstack/react-query';
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

export const useBlogList = (params = '') =>
  useQuery({
    queryKey: ['blog', params],
    queryFn: () => get<PaginatedResponse<BlogPostDoc>>(`/blog${params}`),
    staleTime: CONTENT,
  });

export const useBlogPost = (slug?: string) =>
  useQuery({
    queryKey: ['blog', 'post', slug],
    queryFn: () => get<BlogDetailResponse>(`/blog/slug/${slug}`),
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
