import { useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Calendar, Clock, ArrowUpRight, Search } from 'lucide-react';
import SmartImage from '@/components/shared/SmartImage';
import PrefetchLink from '@/components/shared/PrefetchLink';
import Seo from '@/components/ui/Seo';
import { breadcrumbSchema } from '@/lib/structuredData';
import { Section, SectionHeading } from '@/components/shared/Section';
import { useSectionCopy } from '@/hooks/useSectionCopy';
import { useSiteCopy } from '@/hooks/useSiteCopy';
import Reveal from '@/components/motion/Reveal';
import GlassCard from '@/components/shared/GlassCard';
import {
  ErrorState,
  EmptyState,
  CardGridSkeleton,
} from '@/components/ui/States';
import { useBlogList } from '@/hooks/usePortfolio';

const fmt = (d?: string): string =>
  d
    ? new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

export default function Blog() {
  const [q, setQ] = useState('');
  const query = useDebounce(q.trim(), 350);
  const { data, isLoading, isError, refetch } = useBlogList(
    query ? `?q=${encodeURIComponent(query)}` : ''
  );
  const posts = data?.data ?? [];
  const copy = useSectionCopy('blog', {
    index: '~/blog',
    title: 'Writing & notes',
    subtitle:
      'Thoughts on development, the MERN stack, .NET and competitive programming.',
  });
  const st = useSiteCopy('states', {
    postsEmpty: 'No posts published yet — check back soon!',
  });
  const lab = useSiteCopy('labels', {
    searchPlaceholder: 'Search articles…',
    searchAria: 'Search articles',
    unitMin: 'min',
  });

  return (
    <>
      <Seo
        title="Blog"
        path="/blog"
        description="Articles, notes and writeups."
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
        ])}
      />
      <Section id="blog-page" className="pt-16 sm:pt-24">
        <SectionHeading
          index={copy.index}
          title={copy.title}
          subtitle={copy.subtitle}
          action={
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={lab.searchPlaceholder}
                aria-label={lab.searchAria}
                className="input w-full pl-9 sm:w-56"
              />
            </div>
          }
        />

        {isLoading && <CardGridSkeleton />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {!isLoading && !isError && posts.length === 0 && (
          <EmptyState message={st.postsEmpty} />
        )}

        <div className="grid auto-rows-[1fr] gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <Reveal key={post._id} delay={i * 0.05}>
              <PrefetchLink to={`/blog/${post.slug}`} className="block h-full">
                <GlassCard
                  interactive
                  className="group flex h-full flex-col overflow-hidden"
                >
                  <div className="relative aspect-video overflow-hidden border-b border-border/60">
                    {post.coverImage ? (
                      <SmartImage
                        src={post.coverImage}
                        alt={post.title}
                        imgWidth={640}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center bg-grid [background-size:34px_34px] font-mono text-2xl text-border">
                        {'{ }'}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent opacity-70" />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {post.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-border/60 bg-card/60 px-2.5 py-0.5 text-[11px] text-muted-foreground"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                    <h2 className="text-lg font-bold text-foreground transition-colors group-hover:text-neon">
                      {post.title}
                    </h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground/70">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {fmt(post.publishedAt || post.createdAt)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> {post.readingTime}{' '}
                        {lab.unitMin}
                        <ArrowUpRight className="ml-1 h-4 w-4 text-neon transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                    </div>
                  </div>
                </GlassCard>
              </PrefetchLink>
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
