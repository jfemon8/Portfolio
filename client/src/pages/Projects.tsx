import { useState } from 'react';
import Seo from '@/components/ui/Seo';
import { breadcrumbSchema } from '@/lib/structuredData';
import { Section, SectionHeading } from '@/components/shared/Section';
import Reveal from '@/components/motion/Reveal';
import ProjectCard from '@/components/shared/ProjectCard';
import { Spinner, ErrorState, EmptyState } from '@/components/ui/States';
import { useProjects } from '@/hooks/usePortfolio';
import { cn } from '@/lib/cn';
import type { ProjectCategory } from '@/types';

type Filter = 'all' | ProjectCategory;

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'fullstack', label: 'Full-stack' },
  { key: 'frontend', label: 'Front-end' },
  { key: 'backend', label: 'Back-end' },
];

export default function Projects() {
  const [filter, setFilter] = useState<Filter>('all');
  const { data, isLoading, isError, refetch } = useProjects();
  const all = data?.data ?? [];
  const projects =
    filter === 'all' ? all : all.filter((p) => p.category === filter);

  return (
    <>
      <Seo
        title="Projects"
        path="/projects"
        description="Full-stack platforms, front-ends and experiments — from MERN products to .NET e-commerce."
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Projects', path: '/projects' },
        ])}
      />
      <Section id="projects-page" className="pt-32">
        <SectionHeading
          index="~/projects"
          title="Things I've built"
          subtitle="Full-stack platforms, front-ends and experiments — from MERN products to .NET e-commerce."
        />

        <div className="mb-12 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm transition-all duration-200',
                filter === f.key
                  ? 'border-primary/50 bg-primary/10 text-primary shadow-glow'
                  : 'border-border/70 text-muted-foreground hover:border-primary/30 hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading && <Spinner />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {!isLoading && !isError && projects.length === 0 && (
          <EmptyState message="No projects in this category yet." />
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
