import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  BlogDetailResponse,
  BlogPostDoc,
  CertificationDoc,
  EducationDoc,
  ExperienceDoc,
  ItemResponse,
  ListResponse,
  PaginatedResponse,
  ProfileDoc,
  ProjectDoc,
  PublicationDoc,
  SkillDoc,
} from '@/types';

const get = async <T>(url: string): Promise<T> =>
  (await api.get<T>(url)).data;

export const useProfile = () =>
  useQuery({
    queryKey: ['profile'],
    queryFn: () => get<ItemResponse<ProfileDoc>>('/profile'),
  });

export const useProjects = (params = '') =>
  useQuery({
    queryKey: ['projects', params],
    queryFn: () => get<ListResponse<ProjectDoc>>(`/projects${params}`),
  });

export const useProject = (slug?: string) =>
  useQuery({
    queryKey: ['project', slug],
    queryFn: () => get<ItemResponse<ProjectDoc>>(`/projects/slug/${slug}`),
    enabled: !!slug,
  });

export const useExperience = () =>
  useQuery({
    queryKey: ['experience'],
    queryFn: () => get<ListResponse<ExperienceDoc>>('/experience'),
  });

export const useSkills = () =>
  useQuery({
    queryKey: ['skills'],
    queryFn: () => get<ListResponse<SkillDoc>>('/skills'),
  });

export const useEducation = () =>
  useQuery({
    queryKey: ['education'],
    queryFn: () => get<ListResponse<EducationDoc>>('/education'),
  });

export const useCertifications = () =>
  useQuery({
    queryKey: ['certifications'],
    queryFn: () => get<ListResponse<CertificationDoc>>('/certifications'),
  });

export const usePublications = () =>
  useQuery({
    queryKey: ['publications'],
    queryFn: () => get<ListResponse<PublicationDoc>>('/publications'),
  });

export const useBlogList = (params = '') =>
  useQuery({
    queryKey: ['blog', params],
    queryFn: () => get<PaginatedResponse<BlogPostDoc>>(`/blog${params}`),
  });

export const useBlogPost = (slug?: string) =>
  useQuery({
    queryKey: ['blog', 'post', slug],
    queryFn: () => get<BlogDetailResponse>(`/blog/slug/${slug}`),
    enabled: !!slug,
  });
