import { useState } from 'react';
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
import { projectSchema, breadcrumbSchema } from '@/lib/structuredData';
import RichText from '@/components/shared/RichText';
import SmartImage from '@/components/shared/SmartImage';
import Lightbox from '@/components/shared/Lightbox';
import GlassCard from '@/components/shared/GlassCard';
import Counter from '@/components/shared/Counter';
import Reveal from '@/components/motion/Reveal';
import { Button } from '@/components/ui/button';
import { Spinner, ErrorState } from '@/components/ui/States';
import { useProject, useProfile } from '@/hooks/usePortfolio';
import { useSiteCopy } from '@/hooks/useSiteCopy';
import { capitalizeFirst } from '@/lib/text';
import type { CaseStudy } from '@/types';

const CASE_KEYS: (keyof CaseStudy)[] = [
  'problem',
  'process',
  'architecture',
  'database',
  'api',
  'challenges',
  'solutions',
  'optimization',
  'learnings',
];

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [lb, setLb] = useState<number | null>(null);
  const { data, isLoading, isError, refetch } = useProject(slug);
  const { data: profData } = useProfile();
  const p = data?.data;
  const st = useSiteCopy('states', {
    projectNotFound: 'Project Not Found.',
  });
  const lab = useSiteCopy('labels', {
    caseProblem: 'Problem Statement',
    caseProcess: 'UI / UX Process',
    caseArchitecture: 'Technical Architecture',
    caseDatabase: 'Database Design',
    caseApi: 'API Architecture',
    caseChallenges: 'Challenges Faced',
    caseSolutions: 'Solutions Implemented',
    caseOptimization: 'Optimization Strategy',
    caseLearnings: 'Learnings',
    btnBack: 'Back',
    backToProjects: 'Back To Projects',
    btnSourceCode: 'Source Code',
    btnLiveDemo: 'Live Demo',
    headingHighlights: 'Key Highlights',
    unitViews: 'Views',
  });

  if (isLoading)
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <Spinner />
      </div>
    );
  if (isError || !p)
    return (
      <div className="container-x py-4 text-center">
        <ErrorState
          message={st.projectNotFound}
          onRetry={() => void refetch()}
        />
        <Link to="/projects" className="mt-6 inline-block">
          <Button variant="outline">{lab.backToProjects}</Button>
        </Link>
      </div>
    );

  return (
    <>
      <Seo
        title={p.title}
        description={p.summary || p.tagline}
        image={p.coverImage}
        path={`/projects/${p.slug}`}
        jsonLd={[
          projectSchema(p, profData?.data?.name),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Projects', path: '/projects' },
            { name: p.title, path: `/projects/${p.slug}` },
          ]),
        ]}
      />
      <article className="container-x py-4">
        <Reveal>
          <button
            onClick={() => navigate(-1)}
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-neon"
          >
            <ArrowLeft className="h-4 w-4" /> {lab.btnBack}
          </button>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground/70">
            <span className="rounded-full border border-border/60 bg-card/60 px-3 py-1 capitalize text-muted-foreground backdrop-blur-md backdrop-saturate-150 backdrop-brightness-105">
              {capitalizeFirst(p.category)}
            </span>
            {p.year && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {p.year}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> {p.views} {lab.unitViews}
            </span>
            <span className="flex items-center gap-1.5 capitalize text-neon">
              <CheckCircle2 className="h-3.5 w-3.5" />{' '}
              {capitalizeFirst(p.status)}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
            {p.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{p.tagline}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            {p.sourceUrl && (
              <a href={p.sourceUrl} target="_blank" rel="noreferrer">
                <Button size="lg">
                  <Github className="h-4 w-4" /> {lab.btnSourceCode}
                </Button>
              </a>
            )}
            {p.liveUrl && (
              <a href={p.liveUrl} target="_blank" rel="noreferrer">
                <Button size="lg" variant="outline">
                  <ExternalLink className="h-4 w-4" /> {lab.btnLiveDemo}
                </Button>
              </a>
            )}
          </div>
        </Reveal>

        {p.coverImage && (
          <Reveal delay={0.05}>
            <SmartImage
              src={p.coverImage}
              alt={p.title}
              priority
              className="mt-9 aspect-video w-full rounded-2xl border border-border/70 object-cover"
            />
          </Reveal>
        )}

        {p.videoUrl && (
          <Reveal delay={0.06}>
            <div className="mt-6 overflow-hidden rounded-2xl border border-border/70">
              <video
                src={p.videoUrl}
                poster={p.coverImage || undefined}
                controls
                preload="none"
                playsInline
                className="aspect-video w-full bg-background"
              />
            </div>
          </Reveal>
        )}

        <Reveal delay={0.08}>
          <div className="mt-8 flex flex-wrap gap-2">
            {p.techStack.map((t) => (
              <span
                key={t}
                className="rounded-md border border-border/60 bg-card/60 px-2.5 py-1 font-mono text-xs text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        </Reveal>

        {p.metrics.length > 0 && (
          <Reveal delay={0.09}>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {p.metrics.map((m) => (
                <GlassCard key={m.label} className="p-5 text-center">
                  <Counter
                    value={m.value}
                    className="block text-2xl font-extrabold text-neon"
                  />
                  <p className="mt-1 text-2xs uppercase tracking-wide text-muted-foreground/70">
                    {m.label}
                  </p>
                </GlassCard>
              ))}
            </div>
          </Reveal>
        )}

        {p.highlights.length > 0 && (
          <Reveal delay={0.1}>
            <GlassCard className="mt-8 p-6">
              <h2 className="mb-4 font-semibold text-foreground">
                {lab.headingHighlights}
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {p.highlights.map((h, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-neon" />
                    {h}
                  </li>
                ))}
              </ul>
            </GlassCard>
          </Reveal>
        )}

        {(() => {
          const cs = p.caseStudy;
          const caseLabels: Record<keyof CaseStudy, string> = {
            problem: lab.caseProblem,
            process: lab.caseProcess,
            architecture: lab.caseArchitecture,
            database: lab.caseDatabase,
            api: lab.caseApi,
            challenges: lab.caseChallenges,
            solutions: lab.caseSolutions,
            optimization: lab.caseOptimization,
            learnings: lab.caseLearnings,
          };
          const sections = cs ? CASE_KEYS.filter((k) => cs[k]?.trim()) : [];

          if (sections.length > 0) {
            return (
              <div className="mt-10 space-y-8 sm:mt-14 sm:space-y-14">
                {sections.map((k, i) => (
                  <Reveal key={k} delay={0.04}>
                    <section>
                      <div className="mb-5 flex items-center gap-3">
                        <span className="font-mono text-sm text-neon">
                          {String(i + 1).padStart(2, '0')}.
                        </span>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">
                          {caseLabels[k]}
                        </h2>
                        <span className="h-px flex-1 bg-border/60" />
                      </div>
                      <RichText html={cs![k]} />
                    </section>
                  </Reveal>
                ))}
              </div>
            );
          }

          return p.description ? (
            <Reveal delay={0.12}>
              <div className="mt-10">
                <RichText html={p.description} />
              </div>
            </Reveal>
          ) : null;
        })()}

        {p.gallery.length > 0 && (
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {p.gallery.map((g, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <figure>
                  <button
                    type="button"
                    onClick={() => setLb(i)}
                    aria-label={`View ${g.caption || `image ${i + 1}`}`}
                    className="block w-full"
                  >
                    <GlassCard interactive className="overflow-hidden">
                      <SmartImage
                        src={g.url}
                        alt={g.caption || `${p.title} ${i + 1}`}
                        imgWidth={900}
                        className="aspect-video w-full object-cover"
                      />
                    </GlassCard>
                  </button>
                  {g.caption && (
                    <figcaption className="mt-2 text-center text-xs text-muted-foreground/70">
                      {g.caption}
                    </figcaption>
                  )}
                </figure>
              </Reveal>
            ))}
          </div>
        )}
      </article>
      <Lightbox
        images={p.gallery.map((g) => ({ url: g.url, caption: g.caption }))}
        open={lb !== null}
        startIndex={lb ?? 0}
        onClose={() => setLb(null)}
      />
    </>
  );
}
