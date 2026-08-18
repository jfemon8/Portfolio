import { useState } from 'react';
import Seo from '@/components/ui/Seo';
import { breadcrumbSchema, collectionPageSchema } from '@/lib/structuredData';
import { Section, SectionHeading } from '@/components/shared/Section';
import { useSectionCopy } from '@/hooks/useSectionCopy';
import { useSiteCopy } from '@/hooks/useSiteCopy';
import Reveal from '@/components/motion/Reveal';
import ProjectCard from '@/components/shared/ProjectCard';
import Async from '@/components/ui/Async';
import { ProjectCardSkeleton } from '@/components/ui/Skeletons';
import { PAGE_SEO } from '@/lib/pageSeo';
import { useProjects } from '@/hooks/usePortfolio';
import { cn } from '@/lib/cn';
import type { ProjectCategory } from '@/types';

type Filter = 'all' | ProjectCategory;

const FILTERS: Filter[] = ['all', 'fullstack', 'frontend', 'backend'];

export default function Projects() {
  const [filter, setFilter] = useState<Filter>('all');
  const projectsQuery = useProjects();
  const all = projectsQuery.data?.data ?? [];
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
        title={PAGE_SEO.projects.title}
        path="/projects"
        description={PAGE_SEO.projects.description}
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
            PAGE_SEO.projects.description
          ),
        ]}
      />
      <Section id="projects-page" className="mt-4 pt-4">
        <SectionHeading
          as="h1"
          index={copy.index}
          title={copy.title}
          subtitle={copy.subtitle}
        />

        <div className="mb-4 flex flex-wrap gap-2">
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

        <div className="grid auto-rows-[1fr] gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Async
            query={projectsQuery}
            select={() => projects}
            hint="projects"
            skeleton={(n) => <ProjectCardSkeleton count={n} />}
            empty={st.projectsFilterEmpty}
            stateClass="col-span-full"
          >
            {(items) =>
              items.map((p, i) => (
                <Reveal key={p._id} delay={i * 0.05}>
                  <ProjectCard project={p} />
                </Reveal>
              ))
            }
          </Async>
        </div>
      </Section>
    </>
  );
}
