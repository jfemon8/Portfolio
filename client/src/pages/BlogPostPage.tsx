import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Calendar, Clock, Eye, Share2 } from 'lucide-react';
import Seo from '@/components/ui/Seo';
import { articleSchema, breadcrumbSchema } from '@/lib/structuredData';
import Markdown from '@/components/shared/Markdown';
import SmartImage from '@/components/shared/SmartImage';
import GlassCard from '@/components/shared/GlassCard';
import Reveal from '@/components/motion/Reveal';
import { Button } from '@/components/ui/button';
import { Spinner, ErrorState } from '@/components/ui/States';
import { useBlogPost, useProfile } from '@/hooks/usePortfolio';
import { useSiteCopy } from '@/hooks/useSiteCopy';

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
  const { data: profData } = useProfile();
  const post = data?.data;
  const related = data?.related ?? [];
  const st = useSiteCopy('states', { postNotFound: 'Post not found.' });
  const lab = useSiteCopy('labels', {
    btnBack: 'Back',
    backToBlog: 'Back to blog',
    unitMinRead: 'min read',
    unitViews: 'views',
    btnShare: 'Share',
    headingRelated: 'Related posts',
    toastLinkCopied: 'Link copied to clipboard',
    toastCopyFailed: 'Could not copy link',
  });

  const share = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(lab.toastLinkCopied);
    } catch {
      toast.error(lab.toastCopyFailed);
    }
  };

  if (isLoading)
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <Spinner />
      </div>
    );
  if (isError || !post)
    return (
      <div className="container-x py-32 text-center">
        <ErrorState message={st.postNotFound} onRetry={() => void refetch()} />
        <Link to="/blog" className="mt-6 inline-block">
          <Button variant="outline">{lab.backToBlog}</Button>
        </Link>
      </div>
    );

  return (
    <>
      <Seo
        title={post.title}
        description={post.excerpt}
        image={post.coverImage}
        path={`/blog/${post.slug}`}
        type="article"
        publishedTime={post.publishedAt || post.createdAt}
        modifiedTime={post.updatedAt}
        tags={post.tags}
        jsonLd={[
          articleSchema(post, profData?.data?.name),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Blog', path: '/blog' },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
        ]}
      />
      <article className="container-x max-w-3xl pb-24 pt-24 sm:pt-32">
        <Reveal>
          <button
            onClick={() => navigate(-1)}
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-neon"
          >
            <ArrowLeft className="h-4 w-4" /> {lab.btnBack}
          </button>

          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </div>

          <h1 className="mt-5 text-balance text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
            {post.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-5 text-xs text-muted-foreground/70">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {fmt(post.publishedAt || post.createdAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> {post.readingTime}{' '}
              {lab.unitMinRead}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> {post.views} {lab.unitViews}
            </span>
            <button
              onClick={share}
              className="ml-auto flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-neon"
            >
              <Share2 className="h-3.5 w-3.5" /> {lab.btnShare}
            </button>
          </div>
        </Reveal>

        {post.coverImage && (
          <Reveal delay={0.05}>
            <SmartImage
              src={post.coverImage}
              alt={post.title}
              priority
              className="mt-9 w-full rounded-2xl border border-border/70"
            />
          </Reveal>
        )}

        <Reveal delay={0.1}>
          <div className="mt-10">
            <Markdown>{post.content}</Markdown>
          </div>
        </Reveal>

        {related.length > 0 && (
          <div className="mt-16 border-t border-border/60 pt-10">
            <h2 className="mb-6 text-xl font-bold text-foreground">
              {lab.headingRelated}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r, i) => (
                <Reveal key={r._id} delay={i * 0.06}>
                  <Link to={`/blog/${r.slug}`} className="block h-full">
                    <GlassCard interactive className="h-full p-4">
                      <h3 className="text-sm font-semibold text-foreground">
                        {r.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/70">
                        {r.excerpt}
                      </p>
                    </GlassCard>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        )}
      </article>
    </>
  );
}
