import { Github, Globe, ArrowUpRight, Star, Eye, Play } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import SmartImage from '@/components/shared/SmartImage';
import PrefetchLink from '@/components/shared/PrefetchLink';
import { track } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useSiteCopy } from '@/hooks/useSiteCopy';
import { capitalizeFirst } from '@/lib/text';
import type { ProjectDoc } from '@/types';

interface ProjectCardProps {
  project: ProjectDoc;
  /** larger hero card in the bento grid */
  featured?: boolean;
  className?: string;
}

/**
 * The single premium project card (project rule #3) — 3D tilt, glass,
 * magnetic links, tech badges, metrics. Adapts to normal & bento sizes.
 */
export default function ProjectCard({
  project,
  featured = false,
  className,
}: ProjectCardProps) {
  const href = `/projects/${project.slug}`;
  const onOpen = () => track('project_click', '/projects', project.slug);
  const lab = useSiteCopy('labels', {
    badgeFeatured: 'Featured',
    badgeVideo: 'Video',
    btnSourceCode: 'Source code',
    btnLiveDemo: 'Live demo',
    btnCaseStudy: 'Case study',
  });

  return (
    <div className={cn('group relative h-full rounded-2xl', className)}>
      <GlassCard interactive className="flex h-full flex-col overflow-hidden">
        {/* Cover */}
        <PrefetchLink
          to={href}
          onClick={onOpen}
          className={cn(
            'relative block overflow-hidden border-b border-border/60',
            featured ? 'aspect-[16/10]' : 'aspect-video'
          )}
        >
          {project.coverImage ? (
            <SmartImage
              src={project.coverImage}
              alt={project.title}
              imgWidth={featured ? 900 : 640}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center bg-grid [background-size:36px_36px]">
              <span className="font-mono text-3xl font-bold text-border">
                {'<'}
                {project.title?.slice(0, 2).toUpperCase()}
                {' />'}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-70" />

          {project.featured && (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] font-semibold text-neon backdrop-blur">
              <Star className="h-3 w-3 fill-neon" /> {lab.badgeFeatured}
            </span>
          )}
          <span className="absolute left-3 top-3 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur">
            {capitalizeFirst(project.category)}
          </span>
          {project.videoUrl && (
            <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-neon backdrop-blur">
              <Play className="h-3 w-3 fill-neon" /> {lab.badgeVideo}
            </span>
          )}
        </PrefetchLink>

        {/* Body */}
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-2 flex items-start justify-between gap-3">
            <PrefetchLink
              to={href}
              onClick={onOpen}
              className={cn(
                'font-bold text-foreground transition-colors group-hover:text-neon',
                featured ? 'text-2xl' : 'text-lg'
              )}
            >
              {project.title}
            </PrefetchLink>
            {project.year && (
              <span className="shrink-0 font-mono text-xs text-muted-foreground/70">
                {project.year}
              </span>
            )}
          </div>

          <p
            className={cn(
              'flex-1 text-sm leading-relaxed text-muted-foreground',
              featured ? 'line-clamp-3' : 'line-clamp-2'
            )}
          >
            {project.summary || project.tagline}
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {(project.techStack ?? []).slice(0, featured ? 7 : 4).map((t) => (
              <span
                key={t}
                className="rounded-md border border-border/60 bg-card/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
              >
                {t}
              </span>
            ))}
            {(project.techStack?.length ?? 0) > (featured ? 7 : 4) && (
              <span className="rounded-md px-2 py-0.5 font-mono text-[11px] text-muted-foreground/60">
                +{(project.techStack?.length ?? 0) - (featured ? 7 : 4)}
              </span>
            )}
          </div>

          <div className="mt-5 flex items-center gap-4 border-t border-border/60 pt-4 text-sm">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
              <Eye className="h-3.5 w-3.5" /> {project.views}
            </span>
            {project.sourceUrl && (
              <a
                href={project.sourceUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={lab.btnSourceCode}
                title={lab.btnSourceCode}
                className="-m-2 flex items-center gap-1.5 p-2 text-muted-foreground transition-colors hover:text-neon"
              >
                <Github className="h-4 w-4" />
              </a>
            )}
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={lab.btnLiveDemo}
                title={lab.btnLiveDemo}
                className="-m-2 flex items-center gap-1.5 p-2 text-muted-foreground transition-colors hover:text-neon"
              >
                <Globe className="h-4 w-4" />
              </a>
            )}
            <PrefetchLink
              to={href}
              onClick={onOpen}
              className="ml-auto flex items-center gap-1 font-medium text-neon"
            >
              {lab.btnCaseStudy}
              <ArrowUpRight className="h-4 w-4" />
            </PrefetchLink>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
