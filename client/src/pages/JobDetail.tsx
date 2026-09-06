import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  Clock,
  ExternalLink,
  MapPin,
  Wallet,
} from 'lucide-react';
import Seo from '@/components/ui/Seo';
import { breadcrumbSchema } from '@/lib/structuredData';
import { absoluteUrl } from '@/config/site';
import GlassCard from '@/components/shared/GlassCard';
import {
  AppliedBadge,
  SaveButton,
  JobTrackerNote,
} from '@/components/shared/JobTrackerControls';
import { useJobTracker } from '@/stores/jobTracker';
import JobAttachments from '@/components/shared/JobAttachments';
import RichText from '@/components/shared/RichText';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/States';
import { DetailPageSkeleton } from '@/components/ui/Skeletons';
import { useJob } from '@/hooks/usePortfolio';
import { daysUntil, formatDate, timeAgo } from '@/lib/date';
import { formatJobDescription } from '@/lib/jobText';
import { cn } from '@/lib/cn';
import type { JobDoc } from '@/types';

/** schema.org JobPosting — the markup Google Jobs actually reads. */
const jobPostingSchema = (job: JobDoc): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'JobPosting',
  title: job.title,
  description: job.description || job.title,
  ...(job.publishedAt ? { datePosted: job.publishedAt } : {}),
  ...(job.deadline ? { validThrough: job.deadline } : {}),
  ...(job.employmentType
    ? {
        employmentType: job.employmentType
          .toUpperCase()
          .replace(/[\s-]+/g, '_'),
      }
    : {}),
  ...(job.salary
    ? { estimatedSalary: { '@type': 'MonetaryAmount', value: job.salary } }
    : {}),
  hiringOrganization: { '@type': 'Organization', name: job.company },
  jobLocation: {
    '@type': 'Place',
    address: {
      '@type': 'PostalAddress',
      addressLocality: job.location || 'Bangladesh',
      addressCountry: 'BD',
    },
  },
  ...(job.applyUrl || job.sourceUrl
    ? { directApply: false, url: job.applyUrl || job.sourceUrl }
    : {}),
  mainEntityOfPage: absoluteUrl(`/tools/jobs/${job._id}`),
});

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useJob(id);
  // A directly-opened detail page needs the server-synced tracker state too.
  const hydrate = useJobTracker((s) => s.hydrate);
  useEffect(() => void hydrate(), [hydrate]);
  const job = data?.data;
  const related = data?.related ?? [];
  const status =
    error && typeof error === 'object' && 'status' in error
      ? Number(error.status)
      : undefined;

  if (isLoading) {
    return (
      <div className="container-x py-4">
        <DetailPageSkeleton cover={false} />
      </div>
    );
  }

  if (isError || !job) {
    const message =
      status === 410
        ? 'This job has expired. Its description is no longer available.'
        : 'This job could not be found.';
    return (
      <div className="container-x py-4 text-center">
        <ErrorState message={message} onRetry={() => void refetch()} />
        <Link to="/tools/jobs" className="mt-4 inline-block">
          <Button variant="outline">Back to jobs</Button>
        </Link>
      </div>
    );
  }

  const destination = job.applyUrl || job.sourceUrl;
  const remaining = daysUntil(job.deadline);
  const closingSoon = remaining !== null && remaining >= 0 && remaining <= 3;
  const attachments = job.attachments ?? [];
  // When the circular IS the posting, an empty description block would just be noise.
  const hasCircular = attachments.length > 0;

  return (
    <>
      <Seo
        title={`${job.title} at ${job.company}`}
        description={`Apply for ${job.title} at ${job.company} in ${job.location || 'Bangladesh'}.`}
        path={`/tools/jobs/${job._id}`}
        jsonLd={[
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Job Circular Finder', path: '/tools/jobs' },
            { name: job.title, path: `/tools/jobs/${job._id}` },
          ]),
          jobPostingSchema(job),
        ]}
      />
      <article className="container-x py-4">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-neon"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <GlassCard className="p-2 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2 py-1 text-2xs font-semibold capitalize text-primary">
                {job.category === 'private' ? 'Non-govt.' : job.category}
              </span>
              {job.employmentType && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-2xs text-muted-foreground">
                  <Briefcase className="h-3 w-3" /> {job.employmentType}
                </span>
              )}
            </div>
            <span className="min-w-0 truncate text-xs text-muted-foreground">
              via {job.sourceName}
            </span>
          </div>

          {/* Bengali circular headlines run long and have few break points, so wrapping is forced. */}
          <h1 className="mt-4 break-words text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {job.title}
          </h1>
          <p className="mt-2 break-words text-base font-semibold text-neon sm:text-lg">
            {job.company}
          </p>

          <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-4">
            <span className="flex items-start gap-1">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">
                {job.location || 'Bangladesh'}
              </span>
            </span>
            {job.deadline && (
              <span
                className={cn(
                  'flex items-start gap-1',
                  closingSoon && 'font-semibold text-destructive'
                )}
              >
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" /> Deadline:{' '}
                {formatDate(job.deadline)}
                {remaining !== null &&
                  remaining >= 0 &&
                  ` · ${remaining === 0 ? 'closes today' : `${remaining} day${remaining === 1 ? '' : 's'} left`}`}
              </span>
            )}
            {job.salary && (
              <span className="flex items-start gap-1">
                <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 break-words">{job.salary}</span>
              </span>
            )}
            {job.publishedAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4 shrink-0" /> Posted{' '}
                {timeAgo(job.publishedAt)}
              </span>
            )}
          </div>

          {destination && (
            <a
              href={destination}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block sm:inline-flex"
            >
              <Button size="lg" className="w-full sm:w-auto">
                Apply now <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          )}

          <div className="mt-4 flex items-center gap-2 border-t border-border/50 pt-4">
            <AppliedBadge jobId={job._id} />
            <SaveButton jobId={job._id} />
            <span className="text-2xs text-muted-foreground/70">
              Track without login.
            </span>
          </div>
        </GlassCard>

        <JobTrackerNote jobId={job._id} />

        {(job.description.trim() || !hasCircular) && (
          <section className="mt-4">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Job description
            </h2>
            {job.description.trim() ? (
              <RichText
                html={formatJobDescription(job.description)}
                className="mt-4"
              />
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                This source does not publish a full description. Use the apply
                link above to read the original posting.
              </p>
            )}
          </section>
        )}

        <JobAttachments attachments={attachments} title={job.title} />

        {related.length > 0 && (
          <section className="mt-4">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Similar openings
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item._id}
                  to={`/tools/jobs/${item._id}`}
                  className="block h-full"
                >
                  {/* w-0 + min-w-full — see Blog.tsx's card for why; break-words alone doesn't stop it. */}
                  <GlassCard interactive className="h-full w-0 min-w-full p-4">
                    <p className="break-words font-semibold leading-snug text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-1 break-words text-sm text-neon">
                      {item.company}
                    </p>
                    <p className="mt-2 flex items-start gap-1 text-2xs text-muted-foreground">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0 break-words">
                        {item.location || 'Bangladesh'}
                        {item.deadline && ` · ${formatDate(item.deadline)}`}
                      </span>
                    </p>
                  </GlassCard>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
