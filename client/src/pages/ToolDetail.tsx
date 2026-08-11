import { Suspense } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Seo from '@/components/ui/Seo';
import { breadcrumbSchema } from '@/lib/structuredData';
import { Section } from '@/components/shared/Section';
import Reveal from '@/components/motion/Reveal';
import { Button } from '@/components/ui/button';
import { Spinner, ErrorState } from '@/components/ui/States';
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
  const st = useSiteCopy('states', { toolNotFound: 'Tool Not Found.' });
  const lab = useSiteCopy('labels', {
    btnBack: 'Back',
    backToTools: 'Back To Tools',
  });

  if (isLoading)
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <Spinner />
      </div>
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

  return (
    <>
      <Seo
        title={tool.name}
        description={tool.description}
        path={`/tools/${tool.slug}`}
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Tools', path: '/tools' },
          { name: tool.name, path: `/tools/${tool.slug}` },
        ])}
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
            <p className="mt-4text-base text-muted-foreground">
              {tool.description}
            </p>
          )}
        </Reveal>

        <Reveal delay={0.06}>
          <div className="mt-8">
            <Suspense
              fallback={
                <div className="grid min-h-[30vh] place-items-center">
                  <Spinner />
                </div>
              }
            >
              <Component />
            </Suspense>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
