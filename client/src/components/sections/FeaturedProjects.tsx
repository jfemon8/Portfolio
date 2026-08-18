import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Section, SectionHeading } from '@/components/shared/Section';
import { useSectionCopy } from '@/hooks/useSectionCopy';
import { useSiteCopy } from '@/hooks/useSiteCopy';
import Reveal from '@/components/motion/Reveal';
import Spotlight from '@/components/motion/Spotlight';
import ProjectCard from '@/components/shared/ProjectCard';
import { Button } from '@/components/ui/button';
import Async from '@/components/ui/Async';
import { ProjectCardSkeleton } from '@/components/ui/Skeletons';
import { useProjects } from '@/hooks/usePortfolio';
import { cn } from '@/lib/cn';

// Bento layout: the first featured project gets the hero slot, the rest tile around it.
export default function FeaturedProjects() {
  const projectsQuery = useProjects('?featured=true');
  const copy = useSectionCopy('featured', {
    index: '03.',
    title: 'Featured work',
    subtitle: "A selection of products I've designed, built and shipped.",
  });
  const st = useSiteCopy('states', {
    projectsEmpty: 'Projects coming soon.',
  });

  return (
    <Section id="projects">
      <SectionHeading
        index={copy.index}
        title={copy.title}
        subtitle={copy.subtitle}
        action={
          <Link to="/projects" className="hidden sm:block">
            <Button variant="outline">
              All projects <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      <Spotlight
        size={560}
        className="grid auto-rows-[1fr] gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <Async
          query={projectsQuery}
          select={(r) => r.data}
          hint="featured-projects"
          fallbackCount={3}
          skeleton={(n) => <ProjectCardSkeleton count={n} bento />}
          empty={st.projectsEmpty}
          stateClass="col-span-full"
        >
          {(projects) =>
            projects.map((p, i) => {
              const big = i === 0;
              return (
                <Reveal
                  key={p._id}
                  delay={i * 0.07}
                  className={cn(big && 'sm:col-span-2 lg:row-span-2')}
                >
                  <ProjectCard project={p} featured={big} />
                </Reveal>
              );
            })
          }
        </Async>
      </Spotlight>

      <div className="mt-10 text-center sm:hidden">
        <Link to="/projects">
          <Button variant="outline">
            View all projects <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </Section>
  );
}
