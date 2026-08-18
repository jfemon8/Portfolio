import { Suspense } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Seo from '@/components/ui/Seo';
import {
  breadcrumbSchema,
  softwareApplicationSchema,
} from '@/lib/structuredData';
import { TOOL_SEO, fallbackToolSeo } from '@/lib/toolSeo';
import RelatedTools from '@/components/tools/RelatedTools';
import { Section } from '@/components/shared/Section';
import Reveal from '@/components/motion/Reveal';
import { Button } from '@/components/ui/button';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { ToolDetailSkeleton } from '@/components/ui/Skeletons';
import { useTools, useCategories } from '@/hooks/usePortfolio';
import { useSiteCopy } from '@/hooks/useSiteCopy';
import { TOOL_ICONS } from '@/lib/toolIcon';
import { TOOL_COMPONENTS } from '@/lib/toolRegistry';

export default function ToolDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useTools();
  const { data: categoriesData } = useCategories('tool');
  const tool = data?.data.find((t) => t.slug === slug);
  const categoryLabel =
    categoriesData?.data.find((c) => c.slug === tool?.category)?.name ??
    tool?.category;
  const st = useSiteCopy('states', {
    toolNotFound: 'Tool Not Found.',
    toolUnavailable: 'This Tool Is Not Available Yet.',
  });
  const lab = useSiteCopy('labels', {
    btnBack: 'Back',
    backToTools: 'Back To Tools',
  });

  // The tool component is keyed by `tool.key`, which the slug does not encode — but the frame and back link need not wait for the record.
  if (isLoading)
    return (
      <Section id="tool-detail-page" className="mt-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-neon"
        >
          <ArrowLeft className="h-4 w-4" /> {lab.btnBack}
        </button>
        <ToolDetailSkeleton />
      </Section>
    );

  if (isError || !tool)
    return (
      <div className="container-x py-4 text-center">
        <ErrorState message={st.toolNotFound} onRetry={() => void refetch()} />
        <Link to="/tools" className="mt-6 inline-block">
          <Button variant="outline">{lab.backToTools}</Button>
        </Link>
      </div>
    );

  const Icon = TOOL_ICONS[tool.icon];
  const Component = TOOL_COMPONENTS[tool.key];
  const seo = TOOL_SEO[tool.key] ?? fallbackToolSeo(tool);
  const path = `/tools/${tool.slug}`;
  // Siblings from the same category first, so the internal links point somewhere a visitor plausibly wants.
  const related = (data?.data ?? [])
    .filter((t) => t.slug !== tool.slug)
    .sort(
      (a, b) =>
        Number(b.category === tool.category) -
        Number(a.category === tool.category)
    )
    .slice(0, 6);

  return (
    <>
      <Seo
        title={seo.title}
        exactTitle
        description={seo.description}
        keywords={seo.keywords}
        path={path}
        jsonLd={[
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Tools', path: '/tools' },
            { name: tool.name, path },
          ]),
          softwareApplicationSchema({
            name: tool.name,
            slug: tool.slug,
            description: seo.description,
            category: categoryLabel ?? tool.category,
            features: seo.features,
          }),
        ]}
      />
      <Section id="tool-detail-page" className="mt-4 pt-4">
        <Reveal>
          <button
            onClick={() => navigate(-1)}
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-neon"
          >
            <ArrowLeft className="h-4 w-4" /> {lab.btnBack}
          </button>

          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border/60 bg-background/40 text-neon">
              {Icon && <Icon className="h-6 w-6" />}
            </span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {tool.name}
              </h1>
              <p className="text-sm text-muted-foreground">{categoryLabel}</p>
            </div>
          </div>
          {tool.description && (
            <p className="mt-4 text-base text-muted-foreground">
              {tool.description}
            </p>
          )}
        </Reveal>

        <Reveal delay={0.06}>
          <div className="mt-8">
            {/* A row whose key has no component yet would otherwise render <undefined /> and take the page down. */}
            {Component ? (
              <Suspense
                fallback={<Skeleton className="h-80 w-full rounded-2xl" />}
              >
                <Component />
              </Suspense>
            ) : (
              <ErrorState message={st.toolUnavailable} />
            )}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <RelatedTools tools={related} />
        </Reveal>
      </Section>
    </>
  );
}
