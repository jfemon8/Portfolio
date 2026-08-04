import { useState } from 'react';
import Seo from '@/components/ui/Seo';
import { breadcrumbSchema, collectionPageSchema } from '@/lib/structuredData';
import { Section, SectionHeading } from '@/components/shared/Section';
import { useSectionCopy } from '@/hooks/useSectionCopy';
import { useSiteCopy } from '@/hooks/useSiteCopy';
import Reveal from '@/components/motion/Reveal';
import ProjectCard from '@/components/shared/ProjectCard';
import {
  ErrorState,
  EmptyState,
  CardGridSkeleton,
} from '@/components/ui/States';
import { useProjects } from '@/hooks/usePortfolio';
import { cn } from '@/lib/cn';
import type { ProjectCategory } from '@/types';

type Filter = 'all' | ProjectCategory;

const FILTERS: Filter[] = ['all', 'fullstack', 'frontend', 'backend'];

export default function Projects() {
  const [filter, setFilter] = useState<Filter>('all');
  const { data, isLoading, isError, refetch } = useProjects();
  const all = data?.data ?? [];
  const projects =
    filter === 'all' ? all : all.filter((p) => p.category === filter);
  const copy = useSectionCopy('projects', {
    index: '~/projects',
    title: "Things I've Built",
    subtitle:
      'Full-Stack Platforms, Front-Ends And Experiments — From MERN Products To .NET E-Commerce.',
  });
  const st = useSiteCopy('states', {
    projectsFilterEmpty: 'No Projects In This Category Yet.',
  });
  const lab = useSiteCopy('labels', {
    filterAll: 'All',
    filterFullstack: 'Full-Stack',
    filterFrontend: 'Front-End',
    filterBackend: 'Back-End',
  });
  const filterLabel: Record<string, string> = {
    all: lab.filterAll,
    fullstack: lab.filterFullstack,
    frontend: lab.filterFrontend,
    backend: lab.filterBackend,
  };

  return (
    <>
      <Seo
        title="Projects"
        path="/projects"
        description="Full-Stack Platforms, Front-Ends And Experiments — From MERN Products To .NET E-Commerce."
        jsonLd={[
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Projects', path: '/projects' },
          ]),
          collectionPageSchema(
            'Projects',
            '/projects',
            all.map((p) => ({
              name: p.title,
              path: `/projects/${p.slug}`,
            })),
            'Full-Stack Platforms, Front-Ends And Experiments — From MERN Products To .NET E-Commerce.'
          ),
        ]}
      />
      <Section id="projects-page" className="mt-4 pt-4">
        <SectionHeading
          index={copy.index}
          title={copy.title}
          subtitle={copy.subtitle}
        />

        <div className="mb-12 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm transition-all duration-200',
                filter === f
                  ? 'border-primary/50 bg-primary/10 text-primary shadow-glow'
                  : 'border-border/70 text-muted-foreground hover:border-primary/30 hover:text-foreground'
              )}
            >
              {filterLabel[f]}
            </button>
          ))}
        </div>

        {isLoading && <CardGridSkeleton />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {!isLoading && !isError && projects.length === 0 && (
          <EmptyState message={st.projectsFilterEmpty} />
        )}

        <div className="grid auto-rows-[1fr] gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <Reveal key={p._id} delay={i * 0.05}>
              <ProjectCard project={p} />
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
