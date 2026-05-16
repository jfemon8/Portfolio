import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Github,
  ExternalLink,
  Calendar,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import Seo from '@/components/ui/Seo';
import Markdown from '@/components/ui/Markdown';
import { Spinner, ErrorState } from '@/components/ui/States';
import { useProject } from '@/hooks/usePortfolio';

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useProject(slug);
  const p = data?.data;

  if (isLoading)
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <Spinner />
      </div>
    );
  if (isError || !p)
    return (
      <div className="container-x py-24">
        <ErrorState message="Project not found." onRetry={() => void refetch()} />
        <div className="mt-6 text-center">
          <Link to="/projects" className="btn-outline">
            Back to projects
          </Link>
        </div>
      </div>
    );

  return (
    <>
      <Seo
        title={p.title}
        description={p.summary || p.tagline}
        image={p.coverImage}
        path={`/projects/${p.slug}`}
      />
      <article className="container-x max-w-4xl py-12 sm:py-16">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 inline-flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-neon"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-dim">
          <span className="chip capitalize">{p.category}</span>
          {p.year && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> {p.year}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" /> {p.views} views
          </span>
          <span className="flex items-center gap-1.5 capitalize text-neon">
            <CheckCircle2 className="h-3.5 w-3.5" /> {p.status}
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">{p.title}</h1>
        <p className="mt-3 text-lg text-ink-soft">{p.tagline}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          {p.sourceUrl && (
            <a
              href={p.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              <Github className="h-4 w-4" /> Source code
            </a>
          )}
          {p.liveUrl && (
            <a
              href={p.liveUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-outline"
            >
              <ExternalLink className="h-4 w-4" /> Live demo
            </a>
          )}
        </div>

        {p.coverImage && (
          <img
            src={p.coverImage}
            alt={p.title}
            className="mt-8 w-full rounded-2xl border border-line"
          />
        )}

        <div className="mt-8 flex flex-wrap gap-2">
          {p.techStack.map((t) => (
            <span
              key={t}
              className="rounded-md border border-line bg-bg-elevated px-2.5 py-1 font-mono text-xs text-ink-soft"
            >
              {t}
            </span>
          ))}
        </div>

        {p.highlights.length > 0 && (
          <div className="glass mt-8 p-6">
            <h2 className="mb-4 font-semibold text-ink">Key highlights</h2>
            <ul className="space-y-2">
              {p.highlights.map((h, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink-soft">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-neon" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}

        {p.description && (
          <div className="mt-10">
            <Markdown>{p.description}</Markdown>
          </div>
        )}

        {p.gallery.length > 0 && (
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {p.gallery.map((g, i) => (
              <figure key={i}>
                <img
                  src={g.url}
                  alt={g.caption || `${p.title} ${i + 1}`}
                  className="rounded-xl border border-line"
                />
                {g.caption && (
                  <figcaption className="mt-2 text-center text-xs text-ink-dim">
                    {g.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </article>
    </>
  );
}
