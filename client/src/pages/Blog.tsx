import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowUpRight, Search } from 'lucide-react';
import Seo from '@/components/ui/Seo';
import Reveal from '@/components/ui/Reveal';
import { Spinner, ErrorState, EmptyState } from '@/components/ui/States';
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
  const [query, setQuery] = useState('');
  const { data, isLoading, isError, refetch } = useBlogList(
    query ? `?q=${encodeURIComponent(query)}` : ''
  );
  const posts = data?.data ?? [];

  const onSearch = (e: FormEvent): void => {
    e.preventDefault();
    setQuery(q.trim());
  };

  return (
    <>
      <Seo title="Blog" path="/blog" description="Articles, notes and writeups." />
      <section className="container-x py-16 sm:py-20">
        <Reveal>
          <span className="font-mono text-sm text-neon">~/blog</span>
          <h1 className="section-title mt-2">
            Writing & notes <span className="text-neon">.</span>
          </h1>
          <p className="mt-3 max-w-xl text-ink-soft">
            Thoughts on development, MERN, .NET and competitive programming.
          </p>
        </Reveal>

        <form onSubmit={onSearch} className="mt-8 flex max-w-md gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search articles…"
              className="input pl-9"
            />
          </div>
          <button className="btn-outline">Search</button>
        </form>

        <div className="mt-10">
          {isLoading && <Spinner />}
          {isError && <ErrorState onRetry={() => void refetch()} />}
          {!isLoading && !isError && posts.length === 0 && (
            <EmptyState message="No posts published yet — check back soon!" />
          )}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, i) => (
              <Reveal key={post._id} delay={i * 0.05}>
                <Link
                  to={`/blog/${post.slug}`}
                  className="glass glass-hover group flex h-full flex-col overflow-hidden"
                >
                  <div className="relative aspect-video overflow-hidden border-b border-line bg-bg-elevated">
                    {post.coverImage ? (
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-grid bg-grid font-mono text-2xl text-line">
                        {'{ }'}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {post.tags.slice(0, 3).map((t) => (
                        <span key={t} className="chip">
                          #{t}
                        </span>
                      ))}
                    </div>
                    <h2 className="text-lg font-bold transition-colors group-hover:text-neon">
                      {post.title}
                    </h2>
                    <p className="mt-2 flex-1 text-sm text-ink-soft">
                      {post.excerpt}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-xs text-ink-dim">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {fmt(post.publishedAt || post.createdAt)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> {post.readingTime} min
                        <ArrowUpRight className="ml-1 h-4 w-4 text-neon" />
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
