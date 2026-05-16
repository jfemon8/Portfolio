import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Section, SectionHeading } from '@/components/ui/Section';
import Reveal from '@/components/ui/Reveal';
import ProjectCard from '@/components/ui/ProjectCard';
import { Spinner, ErrorState, EmptyState } from '@/components/ui/States';
import { useProjects } from '@/hooks/usePortfolio';

export default function FeaturedProjects() {
  const { data, isLoading, isError, refetch } = useProjects('?featured=true');
  const projects = data?.data ?? [];

  return (
    <Section id="projects">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          index="03."
          title="Featured projects"
          subtitle="A selection of things I've built and shipped."
        />
        <Link to="/projects" className="btn-outline mb-12 hidden sm:inline-flex">
          All projects <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {isLoading && <Spinner />}
      {isError && <ErrorState onRetry={refetch} />}
      {!isLoading && !isError && projects.length === 0 && (
        <EmptyState message="Projects coming soon." />
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((p, i) => (
          <Reveal key={p._id} delay={i * 0.06}>
            <ProjectCard project={p} />
          </Reveal>
        ))}
      </div>

      <div className="mt-10 text-center sm:hidden">
        <Link to="/projects" className="btn-outline">
          View all projects <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Section>
  );
}
