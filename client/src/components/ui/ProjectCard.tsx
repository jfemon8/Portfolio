import { Link } from 'react-router-dom';
import { Github, ExternalLink, ArrowUpRight, Star } from 'lucide-react';
import { track } from '@/lib/api';
import type { ProjectDoc } from '@/types';

export default function ProjectCard({ project }: { project: ProjectDoc }) {
  return (
    <article className="glass glass-hover group flex flex-col overflow-hidden">
      <Link
        to={`/projects/${project.slug}`}
        onClick={() => track('project_click', '/projects', project.slug)}
        className="block"
      >
        <div className="relative aspect-video overflow-hidden border-b border-line bg-bg-elevated">
          {project.coverImage ? (
            <img
              src={project.coverImage}
              alt={project.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-grid bg-grid">
              <span className="font-mono text-3xl font-bold text-line">
                {'<'}
                {project.title?.slice(0, 2).toUpperCase()}
                {' />'}
              </span>
            </div>
          )}
          {project.featured && (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-bg/80 px-2.5 py-1 text-[11px] font-semibold text-neon backdrop-blur">
              <Star className="h-3 w-3 fill-neon" /> Featured
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <Link
            to={`/projects/${project.slug}`}
            className="text-lg font-bold transition-colors group-hover:text-neon"
          >
            {project.title}
          </Link>
          <span className="chip shrink-0 capitalize">{project.category}</span>
        </div>
        <p className="mb-4 flex-1 text-sm text-ink-soft">
          {project.summary || project.tagline}
        </p>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {(project.techStack || []).slice(0, 5).map((t) => (
            <span
              key={t}
              className="rounded-md bg-bg-elevated px-2 py-0.5 font-mono text-[11px] text-ink-soft"
            >
              {t}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t border-line pt-4 text-sm">
          {project.sourceUrl && (
            <a
              href={project.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-ink-soft transition-colors hover:text-neon"
            >
              <Github className="h-4 w-4" /> Code
            </a>
          )}
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-ink-soft transition-colors hover:text-neon"
            >
              <ExternalLink className="h-4 w-4" /> Live
            </a>
          )}
          <Link
            to={`/projects/${project.slug}`}
            className="ml-auto flex items-center gap-1 font-medium text-neon"
          >
            Details <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
