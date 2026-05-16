import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Eye } from 'lucide-react';
import Seo from '@/components/ui/Seo';
import Markdown from '@/components/ui/Markdown';
import { Spinner, ErrorState } from '@/components/ui/States';
import { useBlogPost } from '@/hooks/usePortfolio';

const fmt = (d?: string): string =>
  d
    ? new Date(d).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useBlogPost(slug);
  const post = data?.data;
  const related = data?.related ?? [];

  if (isLoading)
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <Spinner />
      </div>
    );
  if (isError || !post)
    return (
      <div className="container-x py-24">
        <ErrorState message="Post not found." onRetry={() => void refetch()} />
        <div className="mt-6 text-center">
          <Link to="/blog" className="btn-outline">
            Back to blog
          </Link>
        </div>
      </div>
    );

  return (
    <>
      <Seo
        title={post.title}
        description={post.excerpt}
        image={post.coverImage}
        path={`/blog/${post.slug}`}
      />
      <article className="container-x max-w-3xl py-12 sm:py-16">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 inline-flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-neon"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <span key={t} className="chip">
              #{t}
            </span>
          ))}
        </div>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">
          {post.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-ink-dim">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {fmt(post.publishedAt || post.createdAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {post.readingTime} min read
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" /> {post.views} views
          </span>
        </div>

        {post.coverImage && (
          <img
            src={post.coverImage}
            alt={post.title}
            className="mt-8 w-full rounded-2xl border border-line"
          />
        )}

        <div className="mt-10">
          <Markdown>{post.content}</Markdown>
        </div>

        {related.length > 0 && (
          <div className="mt-16 border-t border-line pt-10">
            <h2 className="mb-6 text-xl font-bold">Related posts</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r._id}
                  to={`/blog/${r.slug}`}
                  className="glass glass-hover p-4"
                >
                  <h3 className="text-sm font-semibold text-ink">{r.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-ink-dim">
                    {r.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </>
  );
}
