import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Calendar, Clock, Eye, Share2 } from 'lucide-react';
import Seo from '@/components/ui/Seo';
import { articleSchema, breadcrumbSchema } from '@/lib/structuredData';
import RichText from '@/components/shared/RichText';
import SmartImage from '@/components/shared/SmartImage';
import GlassCard from '@/components/shared/GlassCard';
import Reveal from '@/components/motion/Reveal';
import BlogEngagement from '@/components/sections/BlogEngagement';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/States';
import { DetailPageSkeleton } from '@/components/ui/Skeletons';
import { useBlogPost, useProfile } from '@/hooks/usePortfolio';
import { useSiteCopy } from '@/hooks/useSiteCopy';
import { formatDate, formatTime } from '@/lib/date';
import { getBlogVisitorKey } from '@/lib/blog';
import { useState } from 'react';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [visitorKey] = useState(() => (slug ? getBlogVisitorKey(slug) : ''));
  const { data, isLoading, isError, refetch } = useBlogPost(slug, visitorKey);
  const { data: profData } = useProfile();
  const post = data?.data;
  const related = data?.related ?? [];
  const st = useSiteCopy('states', { postNotFound: 'Post Not Found.' });
  const lab = useSiteCopy('labels', {
    btnBack: 'Back',
    backToBlog: 'Back To Blog',
    unitViews: 'Views',
    btnShare: 'Share',
    headingRelated: 'Related Posts',
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
      <div className="container-x py-4">
        <DetailPageSkeleton />
      </div>
    );
  if (isError || !post)
    return (
      <div className="container-x py-32 text-center">
        <ErrorState message={st.postNotFound} onRetry={() => void refetch()} />
        <Link to="/blog" className="mt-4 inline-block">
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
        keywords={post.tags}
        jsonLd={[
          articleSchema(post, profData?.data?.name),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Blog', path: '/blog' },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
        ]}
      />
      <article className="container-x p-4">
        <Reveal>
          <button
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-neon"
          >
            <ArrowLeft className="h-4 w-4" /> {lab.btnBack}
          </button>

          <div className="no-scrollbar flex items-center gap-1 overflow-x-auto sm:flex-wrap">
            {post.tags.map((t) => (
              <Link
                key={t}
                to={`/blog?tag=${encodeURIComponent(t)}`}
                className="shrink-0 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur-md backdrop-saturate-150 backdrop-brightness-105 transition-colors hover:border-primary/40 hover:text-primary"
              >
                #{t}
              </Link>
            ))}
          </div>

          <h1 className="mt-4 text-2xl font-extrabold leading-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl">
            {post.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground/70">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(post.publishedAt || post.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {formatTime(post.updatedAt)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> {post.views} {lab.unitViews}
            </span>
            <button
              onClick={share}
              className="ml-auto flex items-center gap-1 text-muted-foreground transition-colors hover:text-neon"
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
              className="mt-4 w-full rounded-2xl border border-border/70"
            />
          </Reveal>
        )}

        <Reveal delay={0.01}>
          <div className="mt-4">
            <RichText html={post.content} />
          </div>
        </Reveal>

        {related.length > 0 && (
          <div className="mt-4 border-t border-border/60 pt-4">
            <h2 className="mb-4 text-xl font-bold text-foreground">
              {lab.headingRelated}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r, i) => (
                <Reveal key={r._id} delay={i * 0.05}>
                  <Link to={`/blog/${r.slug}`} className="block h-full">
                    <GlassCard
                      interactive
                      className="h-full w-0 min-w-full p-4"
                    >
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

        {post && data?.engagement && (
          <BlogEngagement
            slug={post.slug}
            visitorKey={visitorKey}
            engagement={data.engagement}
          />
        )}
      </article>
    </>
  );
}
