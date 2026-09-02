import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BriefcaseBusiness,
  CalendarDays,
  Clock,
  ExternalLink,
  FileImage,
  Loader2,
  MapPin,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import Seo from '@/components/ui/Seo';
import { breadcrumbSchema, collectionPageSchema } from '@/lib/structuredData';
import { Section, SectionHeading } from '@/components/shared/Section';
import Async from '@/components/ui/Async';
import { JobCardSkeleton } from '@/components/ui/Skeletons';
import GlassCard from '@/components/shared/GlassCard';
import Reveal from '@/components/motion/Reveal';
import {
  AppliedBadge,
  SaveButton,
  HideButton,
} from '@/components/shared/JobTrackerControls';
import { useJobTracker } from '@/stores/jobTracker';
import { useDebounce } from '@/hooks/useDebounce';
import { PAGE_SEO } from '@/lib/pageSeo';
import { useJobsInfinite } from '@/hooks/usePortfolio';
import { daysUntil, formatDate, timeAgo } from '@/lib/date';
import { cn } from '@/lib/cn';
import type { JobCategory, JobDoc, JobFacets } from '@/types';

type CategoryFilter = 'all' | JobCategory;

const CATEGORIES: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'government', label: 'Govt.' },
  { value: 'private', label: 'Non-govt.' },
  { value: 'it', label: 'IT' },
  { value: 'bank', label: 'Bank' },
  { value: 'ngo', label: 'NGO' },
  { value: 'other', label: 'Other' },
];

const categoryLabel = (category: JobCategory): string =>
  CATEGORIES.find((item) => item.value === category)?.label ?? category;

const isCategory = (value: string): value is CategoryFilter =>
  CATEGORIES.some((item) => item.value === value);

/** How many further boards carried this same vacancy, after the agent merged them. */
const extraSources = (job: JobDoc): number =>
  Math.max(
    0,
    new Set((job.sources ?? []).map((source) => source.key)).size - 1
  );

/** Turns a deadline into the urgency chip shown on the card. */
function deadlineTone(deadline?: string): {
  label: string;
  className: string;
} | null {
  const days = daysUntil(deadline);
  if (days === null) return null;
  if (days < 0)
    return { label: 'Closed', className: 'bg-destructive/10 text-destructive' };
  if (days === 0)
    return {
      label: 'Closes today',
      className: 'bg-destructive/10 text-destructive',
    };
  if (days <= 3)
    return {
      label: `${days} day${days === 1 ? '' : 's'} left`,
      className: 'bg-amber-500/10 text-amber-500',
    };
  if (days <= 14)
    return {
      label: `${days} days left`,
      className: 'bg-primary/10 text-primary',
    };
  return null;
}

function JobCard({ job }: { job: JobDoc }) {
  const navigate = useNavigate();
  const destination = job.applyUrl || job.sourceUrl;
  const urgency = deadlineTone(job.deadline);
  const openDetails = (): void => {
    if (!job.expired) navigate(`/tools/jobs/${job._id}`);
  };

  return (
    <GlassCard
      interactive={!job.expired}
      className={cn(
        'flex h-full w-0 min-w-full flex-col p-4 transition-opacity',
        job.expired && 'opacity-70',
        !job.expired &&
          'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
      )}
      role={!job.expired ? 'link' : undefined}
      tabIndex={!job.expired ? 0 : undefined}
      aria-label={!job.expired ? `View details for ${job.title}` : undefined}
      onClick={openDetails}
      onKeyDown={(event) => {
        if (!job.expired && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          openDetails();
        }
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2 py-1 text-2xs font-semibold text-primary">
            {categoryLabel(job.category)}
          </span>
          {job.attachments && job.attachments.length > 0 && (
            <span
              title="Includes the official circular"
              className="inline-flex items-center gap-1 rounded-full border border-neon/40 px-2 py-1 text-2xs text-neon"
            >
              <FileImage className="h-3 w-3" /> Circular
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {job.employmentType && (
            <span className="rounded-full border border-border/70 px-2 py-1 text-2xs text-muted-foreground">
              {job.employmentType}
            </span>
          )}
          {urgency && (
            <span
              className={cn(
                'rounded-full px-2 py-1 text-2xs font-semibold',
                urgency.className
              )}
            >
              {urgency.label}
            </span>
          )}
        </div>
      </div>

      <h2 className="mt-4 text-lg font-bold leading-snug text-foreground">
        {job.title}
      </h2>
      <p className="mt-1 text-sm font-medium text-neon">{job.company}</p>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-2xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" /> {job.location || 'Bangladesh'}
        </span>
        {job.deadline && (
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" /> Deadline:{' '}
            {formatDate(job.deadline)}
          </span>
        )}
        {job.salary && (
          <span className="flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5" /> {job.salary}
          </span>
        )}
        {job.publishedAt && (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {timeAgo(job.publishedAt)}
          </span>
        )}
      </div>

      {!job.expired && job.description && (
        <p className="mt-4 line-clamp-3 text-sm leading-5 text-muted-foreground">
          {job.description}
        </p>
      )}

      <div className="mt-auto pt-4">
        <p className="truncate text-2xs text-muted-foreground/75">
          via {job.sourceName}
          {extraSources(job) > 0 && ` +${extraSources(job)} more`}
        </p>
        {!job.expired && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AppliedBadge jobId={job._id} />
              <SaveButton jobId={job._id} />
              <HideButton jobId={job._id} />
            </div>
            {destination && (
              <a
                href={destination}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex shrink-0 items-center gap-1 text-2xs font-semibold text-primary transition-colors hover:text-neon"
              >
                Apply <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
}

export default function Jobs() {
  // The filters live in the URL so a filtered board can be shared and restored.
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCategory = searchParams.get('category') ?? 'all';
  const category: CategoryFilter = isCategory(rawCategory)
    ? rawCategory
    : 'all';

  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const query = useDebounce(search.trim(), 350);

  const setFilter = (next: Record<string, string>): void => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        for (const [key, value] of Object.entries(next)) {
          if (!value || value === 'all') params.delete(key);
          else params.set(key, value);
        }
        return params;
      },
      { replace: true }
    );
  };

  // Only the debounced value reaches the URL, so typing never spams history or the API.
  useEffect(() => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (query) params.set('q', query);
        else params.delete('q');
        return params;
      },
      { replace: true }
    );
  }, [query, setSearchParams]);

  const jobsQuery = useJobsInfinite({ category, q: query });
  const { data, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } =
    jobsQuery;

  // One-time merge of server-synced tracker state into the local store.
  const hydrate = useJobTracker((s) => s.hydrate);
  useEffect(() => void hydrate(), [hydrate]);

  // Subscribing to entries keeps the list reactive: hiding a job drops it immediately.
  const trackerEntries = useJobTracker((s) => s.entries);
  const jobs = useMemo(() => {
    const visible = (data?.pages.flatMap((page) => page.data) ?? []).filter(
      (job) => !trackerEntries[job._id]?.hidden
    );
    // Saved first, then applied, then the rest; the sort is stable, so the server order holds within each group.
    const rank = (job: JobDoc): number => {
      const entry = trackerEntries[job._id];
      if (entry?.saved) return 0;
      if (entry?.applied) return 1;
      return 2;
    };
    return [...visible].sort((a, b) => rank(a) - rank(b));
  }, [data, trackerEntries]);
  const total = data?.pages[0]?.pagination.total ?? 0;
  const facets: JobFacets | undefined = data?.pages[0]?.facets;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const element = sentinelRef.current;
    if (!element || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const countFor = (value: CategoryFilter): number | undefined =>
    value === 'all' ? facets?.all : facets?.categories[value];

  const hasFilters = category !== 'all' || Boolean(query);

  return (
    <>
      <Seo
        title={PAGE_SEO.jobs.title}
        path="/tools/jobs"
        description={PAGE_SEO.jobs.description}
        jsonLd={[
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Tools', path: '/tools' },
            { name: 'Job Circular Finder', path: '/tools/jobs' },
          ]),
          collectionPageSchema(
            'Job Circular Finder',
            '/tools/jobs',
            jobs
              .filter((job) => !job.expired)
              .slice(0, 25)
              .map((job) => ({
                name: `${job.title} at ${job.company}`,
                path: `/tools/jobs/${job._id}`,
              })),
            'Government, private, IT, bank and NGO openings across Bangladesh.'
          ),
        ]}
      />
      <Section id="jobs-page" className="mt-4 pt-4">
        <SectionHeading
          as="h1"
          index="~/tools/jobs"
          title="Job Circular Finder"
          subtitle="Government, private, IT, Bank, NGO and Other opportunities from Bangladeshi boards, company career pages and worldwide job portals. Every listing here is still open."
        />

        <div className="mb-4 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="input pl-4 pr-4"
                placeholder="Search title, company, location or type"
                aria-label="Search jobs"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((item) => {
              const count = countFor(item.value);
              return (
                <button
                  key={item.value}
                  onClick={() => setFilter({ category: item.value })}
                  aria-pressed={category === item.value}
                  className={cn(
                    'rounded-full border px-2 py-1 text-xs transition-colors',
                    category === item.value
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-border/70 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {item.label}
                  {count !== undefined && (
                    <span className="ml-1 text-muted-foreground/70">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            {hasFilters && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilter({ category: 'all', q: '' });
                }}
                className="ml-auto text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-neon hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        <div
          className={cn(
            'grid auto-rows-[1fr] gap-4 transition-opacity md:grid-cols-2 lg:grid-cols-3',
            isFetching && !isFetchingNextPage && 'opacity-60'
          )}
        >
          <Async
            query={jobsQuery}
            select={() => jobs}
            hint="jobs"
            skeleton={(n) => <JobCardSkeleton count={n} />}
            empty={
              hasFilters
                ? 'No jobs match these filters. Try widening your search.'
                : 'No jobs are available right now. Please check again after the next daily sync.'
            }
            stateClass="col-span-full"
          >
            {(items) =>
              items.map((job, index) => (
                <Reveal key={job._id} delay={Math.min(index, 5) * 0.05}>
                  <JobCard job={job} />
                </Reveal>
              ))
            }
          </Async>
        </div>

        {jobs.length > 0 && (
          <div className="mt-4 text-center text-xs text-muted-foreground">
            {hasNextPage ? (
              <div
                ref={sentinelRef}
                className="flex items-center justify-center gap-2 py-2"
              >
                {isFetchingNextPage && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Showing {jobs.length} of {total} openings
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <BriefcaseBusiness className="h-3.5 w-3.5" />
                All {jobs.length} matching opening
                {jobs.length === 1 ? '' : 's'} loaded.
              </span>
            )}
          </div>
        )}
      </Section>
    </>
  );
}
