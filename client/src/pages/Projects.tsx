import { useState } from 'react';
import Seo from '@/components/ui/Seo';
import Reveal from '@/components/ui/Reveal';
import ProjectCard from '@/components/ui/ProjectCard';
import { Spinner, ErrorState, EmptyState } from '@/components/ui/States';
import { useProjects } from '@/hooks/usePortfolio';
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
      <Seo title="Projects" path="/projects" />
      <section className="container-x py-16 sm:py-20">
        <Reveal>
          <span className="font-mono text-sm text-neon">~/projects</span>
          <h1 className="section-title mt-2">
            Things I've built <span className="text-neon">.</span>
          </h1>
          <p className="mt-3 max-w-xl text-ink-soft">
            Full-stack apps, front-ends and experiments — from MERN platforms to
            .NET e-commerce.
          </p>
        </Reveal>

        <div className="mt-8 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                filter === f.key
                  ? 'border-neon/50 bg-neon/10 text-neon'
                  : 'border-line text-ink-soft hover:border-neon/30 hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-10">
          {isLoading && <Spinner />}
          {isError && <ErrorState onRetry={() => void refetch()} />}
          {!isLoading && !isError && projects.length === 0 && (
            <EmptyState message="No projects in this category yet." />
          )}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => (
              <Reveal key={p._id} delay={i * 0.05}>
                <ProjectCard project={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
