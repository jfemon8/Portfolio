import { useMemo, useState, type ReactNode } from 'react';
import { ArrowUpRight, BriefcaseBusiness } from 'lucide-react';
import Seo from '@/components/ui/Seo';
import { breadcrumbSchema, collectionPageSchema } from '@/lib/structuredData';
import { TOOL_SEO } from '@/lib/toolSeo';
import { Section, SectionHeading } from '@/components/shared/Section';
import { useSectionCopy } from '@/hooks/useSectionCopy';
import { useSiteCopy } from '@/hooks/useSiteCopy';
import Reveal from '@/components/motion/Reveal';
import ToolCard from '@/components/shared/ToolCard';
import PrefetchLink from '@/components/shared/PrefetchLink';
import GlassCard from '@/components/shared/GlassCard';
import Async from '@/components/ui/Async';
import {
  ToolCardSkeleton,
  FilterTabsSkeleton,
} from '@/components/ui/Skeletons';
import { PAGE_SEO } from '@/lib/pageSeo';
import { useTools, useCategories } from '@/hooks/usePortfolio';
import { cn } from '@/lib/cn';

/** The jobs finder lives at its own route, so its card is declared here rather than coming from the Tool collection. */
const JOBS_CARD = {
  title: 'Job Circular Finder',
  category: 'career',
  label: 'Career',
};

export default function Tools() {
  const [filter, setFilter] = useState('all');
  const toolsQuery = useTools();
  const { data: categoriesData } = useCategories('tool');
  const categoryOptions = useMemo(
    () => categoriesData?.data ?? [],
    [categoriesData]
  );
  const categoryLabel = (slug: string): string =>
    categoryOptions.find((c) => c.slug === slug)?.name ?? slug;
  const all = useMemo(
    () => [...(toolsQuery.data?.data ?? [])].sort((a, b) => a.order - b.order),
    [toolsQuery.data]
  );
  const categories = useMemo(
    () => Array.from(new Set(all.map((t) => t.category))),
    [all]
  );
  const tools =
    filter === 'all' ? all : all.filter((t) => t.category === filter);
  // Every tool's own keywords roll up to the hub, so the listing competes on the same phrases its children do.
  const hubKeywords = useMemo(
    () => [
      'free online tools',
      'browser tools no upload',
      ...all.flatMap((t) => TOOL_SEO[t.key]?.keywords ?? []),
    ],
    [all]
  );
  // The jobs finder is its own page rather than a Tool row, so it is filtered by hand instead of by the query.
  const showJobsCard = filter === 'all' || filter === JOBS_CARD.category;

  const copy = useSectionCopy('tools', {
    index: '~/tools',
    title: 'Free Tools',
    subtitle:
      'Small utilities I built and use myself — free, no signup, come back whenever you need one.',
  });
  const st = useSiteCopy('states', {
    toolsFilterEmpty: 'No Tools In This Category Yet.',
  });
  const lab = useSiteCopy('labels', { filterAll: 'All' });

  // Shared by the real pills and their placeholders, so the row never changes height mid-load.
  const tabRow = (children: ReactNode): ReactNode => (
    <div className="mb-4 flex flex-wrap gap-2">{children}</div>
  );

  return (
    <>
      <Seo
        title={PAGE_SEO.tools.title}
        exactTitle
        path="/tools"
        description={PAGE_SEO.tools.description}
        keywords={hubKeywords}
        jsonLd={[
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Tools', path: '/tools' },
          ]),
          collectionPageSchema(
            'Free Online Tools',
            '/tools',
            [
              { name: JOBS_CARD.title, path: '/tools/jobs' },
              ...all.map((t) => ({ name: t.name, path: `/tools/${t.slug}` })),
            ],
            PAGE_SEO.tools.description
          ),
        ]}
      />
      <Section id="tools-page" className="mt-4 pt-4">
        <SectionHeading
          as="h1"
          index={copy.index}
          title={copy.title}
          subtitle={copy.subtitle}
        />

        <Async
          query={toolsQuery}
          // A lone category means no meaningful filter, so the row collapses to nothing.
          select={() => (categories.length > 1 ? ['all', ...categories] : [])}
          hint="tool-tabs"
          fallbackCount={5}
          skeleton={(n) => tabRow(<FilterTabsSkeleton count={n} />)}
        >
          {(options) =>
            tabRow(
              options.map((f) => (
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
                  {f === 'all' ? lab.filterAll : categoryLabel(f)}
                </button>
              ))
            )
          }
        </Async>

        <div className="grid auto-rows-[1fr] gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Static card: renders on first paint and keeps its slot while the dynamic ones load in beside it. */}
          {showJobsCard && (
            <Reveal>
              <PrefetchLink to="/tools/jobs" className="group block h-full">
                <GlassCard interactive className="flex h-full flex-col p-5">
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-border/60 bg-background/40 text-neon">
                      <BriefcaseBusiness className="h-5 w-5" />
                    </span>
                    <span className="rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-2xs text-muted-foreground backdrop-blur-md">
                      {categoryOptions.find(
                        (c) => c.slug === JOBS_CARD.category
                      )?.name ?? JOBS_CARD.label}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-foreground transition-colors group-hover:text-neon">
                    {JOBS_CARD.title}
                  </h3>
                  {/* flex-1 on a wrapper, not the clamped <p> — see Blog.tsx card for why. */}
                  <div className="mt-1 flex-1">
                    <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
                      All the ongoing Government circulars, opportunities from
                      company career pages and remote roles.
                    </p>
                  </div>

                  <span className="mt-4 flex items-center gap-1 text-sm font-medium text-neon">
                    Open <ArrowUpRight className="h-4 w-4" />
                  </span>
                </GlassCard>
              </PrefetchLink>
            </Reveal>
          )}

          <Async
            query={toolsQuery}
            select={() => tools}
            hint="tools"
            skeleton={(n) => <ToolCardSkeleton count={n} />}
            // With the jobs card present the grid is not actually empty, so the empty state would be wrong.
            empty={showJobsCard ? undefined : st.toolsFilterEmpty}
            stateClass="col-span-full"
          >
            {(items) =>
              items.map((t, i) => (
                <Reveal key={t._id} delay={i * 0.05}>
                  <ToolCard
                    tool={t}
                    categoryLabel={categoryLabel(t.category)}
                  />
                </Reveal>
              ))
            }
          </Async>
        </div>
      </Section>
    </>
  );
}
