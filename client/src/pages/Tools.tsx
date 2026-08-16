import { useMemo, useState } from 'react';
import { ArrowUpRight, BriefcaseBusiness } from 'lucide-react';
import Seo from '@/components/ui/Seo';
import { breadcrumbSchema, collectionPageSchema } from '@/lib/structuredData';
import { Section, SectionHeading } from '@/components/shared/Section';
import { useSectionCopy } from '@/hooks/useSectionCopy';
import { useSiteCopy } from '@/hooks/useSiteCopy';
import Reveal from '@/components/motion/Reveal';
import ToolCard from '@/components/shared/ToolCard';
import PrefetchLink from '@/components/shared/PrefetchLink';
import GlassCard from '@/components/shared/GlassCard';
import {
  ErrorState,
  EmptyState,
  CardGridSkeleton,
} from '@/components/ui/States';
import { useTools, useCategories } from '@/hooks/usePortfolio';
import { cn } from '@/lib/cn';

export default function Tools() {
  const [filter, setFilter] = useState('all');
  const { data, isLoading, isError, refetch } = useTools();
  const { data: categoriesData } = useCategories('tool');
  const categoryOptions = useMemo(
    () => categoriesData?.data ?? [],
    [categoriesData]
  );
  const categoryLabel = (slug: string): string =>
    categoryOptions.find((c) => c.slug === slug)?.name ?? slug;
  const all = useMemo(
    () => [...(data?.data ?? [])].sort((a, b) => a.order - b.order),
    [data]
  );
  const categories = useMemo(
    () => Array.from(new Set(all.map((t) => t.category))),
    [all]
  );
  const tools =
    filter === 'all' ? all : all.filter((t) => t.category === filter);

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

  return (
    <>
      <Seo
        title="Tools"
        path="/tools"
        description={copy.subtitle}
        jsonLd={[
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Tools', path: '/tools' },
          ]),
          collectionPageSchema(
            'Tools',
            '/tools',
            all.map((t) => ({ name: t.name, path: `/tools/${t.slug}` })),
            copy.subtitle
          ),
        ]}
      />
      <Section id="tools-page" className="mt-4 pt-4">
        <SectionHeading
          index={copy.index}
          title={copy.title}
          subtitle={copy.subtitle}
        />

        {categories.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {['all', ...categories].map((f) => (
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
            ))}
          </div>
        )}

        {isLoading && <CardGridSkeleton />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {!isLoading && !isError && tools.length === 0 && (
          <EmptyState message={st.toolsFilterEmpty} />
        )}

        <div className="grid auto-rows-[1fr] gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filter === 'all' && (
            <PrefetchLink to="/tools/jobs" className="group block h-full">
              <GlassCard interactive className="flex h-full flex-col p-5">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-border/60 bg-background/40 text-neon">
                    <BriefcaseBusiness className="h-5 w-5" />
                  </span>
                  <span className="rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-2xs text-muted-foreground backdrop-blur-md">
                    Career
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-bold text-foreground transition-colors group-hover:text-neon">
                  Job Circular Finder
                </h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                  Government circulars, company career pages and remote roles —
                  collected and de-duplicated every night.
                </p>

                <span className="mt-4 flex items-center gap-1 text-sm font-medium text-neon">
                  Open <ArrowUpRight className="h-4 w-4" />
                </span>
              </GlassCard>
            </PrefetchLink>
          )}
          {tools.map((t, i) => (
            <Reveal key={t._id} delay={i * 0.05}>
              <ToolCard tool={t} categoryLabel={categoryLabel(t.category)} />
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
