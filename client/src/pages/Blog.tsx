import { useEffect, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Calendar, Clock, ArrowUpRight, Loader2, Search } from 'lucide-react';
import SmartImage from '@/components/shared/SmartImage';
import PrefetchLink from '@/components/shared/PrefetchLink';
import Seo from '@/components/ui/Seo';
import { breadcrumbSchema, collectionPageSchema } from '@/lib/structuredData';
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
import { useBlogInfinite } from '@/hooks/usePortfolio';
import { formatDate, formatTime } from '@/lib/date';
import { formatCount } from '@/lib/number';

export default function Blog() {
  const [q, setQ] = useState('');
  const query = useDebounce(q.trim(), 350);
  const {
    data,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useBlogInfinite(query);
  const posts = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.pagination.total ?? 0;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const copy = useSectionCopy('blog', {
    index: '~/blog',
    title: 'Writing & Notes',
    subtitle:
      'Thoughts on development, the MERN stack, .NET and competitive programming.',
  });
  const st = useSiteCopy('states', {
    postsEmpty: 'No posts published yet — check back soon!',
    postsSearchEmpty: 'No posts match your search.',
  });
  const lab = useSiteCopy('labels', {
    searchPlaceholder: 'Search articles…',
    searchAria: 'Search articles',
  });

  // Auto-loads the next page once the sentinel below the grid scrolls into view.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <>
      <Seo
        title="Blog"
        path="/blog"
        description="Articles, notes and writeups."
        jsonLd={[
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Blog', path: '/blog' },
          ]),
          collectionPageSchema(
            'Blog',
            '/blog',
            posts.map((p) => ({
              name: p.title,
              path: `/blog/${p.slug}`,
            })),
            'Articles, notes and writeups.'
          ),
        ]}
      />
      <Section id="blog-page" className="mt-4 pt-4">
        <SectionHeading
          index={copy.index}
          title={copy.title}
          // subtitle={copy.subtitle}
          action={
            <div className="relative w-full md:w-auto">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={lab.searchPlaceholder}
                aria-label={lab.searchAria}
                className="input w-full pl-9 md:w-56"
              />
            </div>
          }
        />

        {isLoading && <CardGridSkeleton />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {!isLoading && !isError && posts.length === 0 && (
          <EmptyState message={query ? st.postsSearchEmpty : st.postsEmpty} />
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
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center bg-grid [background-size:2.125rem_2.125rem] font-mono text-2xl text-border">
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
                          className="rounded-full border border-border/60 bg-card/60 px-2.5 py-0.5 text-2xs text-muted-foreground"
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
                        {formatDate(post.publishedAt || post.createdAt)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />{' '}
                        {formatTime(post.updatedAt)}
                        <ArrowUpRight className="ml-1 h-4 w-4 text-neon" />
                      </span>
                    </div>
                  </div>
                </GlassCard>
              </PrefetchLink>
            </Reveal>
          ))}
        </div>

        {posts.length > 0 && (
          <div className="mt-10 text-center text-xs text-muted-foreground">
            {hasNextPage ? (
              <div
                ref={sentinelRef}
                className="flex items-center justify-center gap-2 py-2"
              >
                {isFetchingNextPage && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Showing {posts.length} of {formatCount(total)} articles
              </div>
            ) : (
              <span>All {formatCount(posts.length)} articles loaded.</span>
            )}
          </div>
        )}
      </Section>
    </>
  );
}
