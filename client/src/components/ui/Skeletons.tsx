import { Fragment, type ReactNode } from 'react';
import GlassCard from '@/components/shared/GlassCard';
import { Skeleton } from '@/components/ui/States';
import { cn } from '@/lib/cn';

// Each skeleton reuses the real card's shell rather than hardcoded heights, so a card redesign carries into its placeholder.

/** Fragment of N placeholders — sits directly inside the caller's grid, beside any static cards. */
function Repeat({
  count,
  children,
}: {
  count: number;
  children: (index: number) => ReactNode;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Fragment key={i}>{children(i)}</Fragment>
      ))}
    </>
  );
}

export function ToolCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Repeat count={count}>
      {() => (
        <GlassCard className="flex h-full flex-col p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-6 w-2/3" />
          <div className="mt-2 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
          <Skeleton className="mt-4 h-5 w-20" />
        </GlassCard>
      )}
    </Repeat>
  );
}

/** `bento` mirrors FeaturedProjects, where the first card takes the hero slot. */
export function ProjectCardSkeleton({
  count = 6,
  bento = false,
}: {
  count?: number;
  bento?: boolean;
}) {
  return (
    <Repeat count={count}>
      {(i) => {
        const big = bento && i === 0;
        return (
          <div
            className={cn(
              'h-full rounded-2xl',
              big && 'sm:col-span-2 lg:row-span-2'
            )}
          >
            <GlassCard className="flex h-full flex-col overflow-hidden">
              <Skeleton
                className={cn(
                  'rounded-none',
                  big ? 'aspect-[16/10]' : 'aspect-video'
                )}
              />
              <div className="flex flex-1 flex-col p-5">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <Skeleton className={cn('h-6', big ? 'w-3/5' : 'w-2/3')} />
                  <Skeleton className="h-4 w-10 shrink-0" />
                </div>
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-11/12" />
                  {big && <Skeleton className="h-3.5 w-4/5" />}
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Repeat count={big ? 5 : 3}>
                    {() => <Skeleton className="h-5 w-14 rounded-md" />}
                  </Repeat>
                </div>
                <div className="mt-5 flex items-center gap-4 border-t border-border/60 pt-4">
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="ml-auto h-4 w-24" />
                </div>
              </div>
            </GlassCard>
          </div>
        );
      }}
    </Repeat>
  );
}

export function BlogCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Repeat count={count}>
      {() => (
        <GlassCard className="flex h-full flex-col overflow-hidden">
          <Skeleton className="aspect-video rounded-none" />
          <div className="flex flex-1 flex-col p-5">
            <div className="mb-2 flex flex-wrap gap-1.5">
              <Repeat count={2}>
                {() => <Skeleton className="h-5 w-14 rounded-full" />}
              </Repeat>
            </div>
            <Skeleton className="h-6 w-4/5" />
            <div className="mt-2 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-11/12" />
              <Skeleton className="h-3.5 w-3/5" />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </GlassCard>
      )}
    </Repeat>
  );
}

export function SkillCardSkeleton({ count = 10 }: { count?: number }) {
  return (
    <Repeat count={count}>
      {() => (
        <li className="rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
            <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
          <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
        </li>
      )}
    </Repeat>
  );
}

/** Filter/category pill row — resolves from its own query, so it fills in independently of the grid below it. */
export function FilterTabsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Repeat count={count}>
      {(i) => (
        <Skeleton
          className={cn('h-8 rounded-full', i % 2 === 0 ? 'w-24' : 'w-20')}
        />
      )}
    </Repeat>
  );
}

/** Timeline entries — the dot sits at the real one's offset, so the gradient rail stays aligned. */
export function TimelineItemSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Repeat count={count}>
      {() => (
        <div className="relative pb-10 last:pb-0">
          <Skeleton className="absolute -left-[2.5625rem] h-7 w-7 rounded-full" />
          <GlassCard className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-7 w-36 rounded-full" />
            </div>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-11/12" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Repeat count={4}>
                {() => <Skeleton className="h-5 w-16 rounded-md" />}
              </Repeat>
            </div>
          </GlassCard>
        </div>
      )}
    </Repeat>
  );
}

export function EducationCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Repeat count={count}>
      {() => (
        <GlassCard className="h-full p-6">
          <Skeleton className="mb-4 h-7 w-7 rounded-md" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="mt-2 h-4 w-3/5" />
          <div className="mt-4 flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-3.5 w-32" />
        </GlassCard>
      )}
    </Repeat>
  );
}

export function PublicationCardSkeleton({ count = 2 }: { count?: number }) {
  return (
    <Repeat count={count}>
      {() => (
        <GlassCard className="flex h-full flex-col p-6">
          <Skeleton className="mb-3 h-4 w-40" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="mt-2 h-6 w-2/3" />
          <Skeleton className="mt-4 h-4 w-1/2" />
          <div className="mt-4 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
          </div>
          <Skeleton className="mt-5 h-9 w-32 rounded-xl" />
        </GlassCard>
      )}
    </Repeat>
  );
}

export function CredentialsColumnSkeleton({ count = 2 }: { count?: number }) {
  return (
    <Repeat count={count}>
      {() => (
        <GlassCard className="h-full p-6">
          <Skeleton className="mb-5 h-4 w-32" />
          <ul className="space-y-4">
            <Repeat count={3}>
              {() => (
                <li className="border-l-2 border-border/70 pl-3">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="mt-2 h-3 w-2/5" />
                </li>
              )}
            </Repeat>
          </ul>
        </GlassCard>
      )}
    </Repeat>
  );
}

export function JobCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Repeat count={count}>
      {() => (
        <GlassCard className="flex h-full flex-col p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-6 w-11/12" />
          <Skeleton className="mt-2 h-4 w-1/2" />
          <div className="mt-3 flex flex-wrap gap-3">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
          <div className="mt-auto pt-4">
            <Skeleton className="h-3 w-28" />
            <div className="mt-2.5 flex items-center justify-between">
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-4 w-14" />
            </div>
          </div>
        </GlassCard>
      )}
    </Repeat>
  );
}

/** Terminal block, stat cards and profile bar — the CP section's real layout. */
export function CpStatsSkeleton() {
  return (
    <>
      <Skeleton className="mb-8 h-44 w-full rounded-2xl" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Repeat count={3}>
          {() => (
            <GlassCard className="p-6">
              <Skeleton className="mb-3 h-5 w-5 rounded-md" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="mt-2 h-3 w-28" />
            </GlassCard>
          )}
        </Repeat>
      </div>
      <GlassCard className="mt-5 flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-10 w-40 rounded-xl" />
      </GlassCard>
    </>
  );
}

/** About's left column: summary paragraph plus the stat tiles under it. */
export function AboutIntroSkeleton({ stats = 4 }: { stats?: number }) {
  return (
    <>
      <div className="space-y-3">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-11/12" />
        <Skeleton className="h-5 w-3/4" />
      </div>
      {stats > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Repeat count={stats}>
            {() => (
              <GlassCard className="p-4 text-center">
                <Skeleton className="mx-auto h-8 w-14" />
                <Skeleton className="mx-auto mt-2 h-3 w-16" />
              </GlassCard>
            )}
          </Repeat>
        </div>
      )}
    </>
  );
}

/** About's right column: avatar card plus the languages/details card. */
export function AboutAsideSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <GlassCard className="p-6 text-center">
        <Skeleton className="mx-auto h-44 w-44 rounded-full sm:h-48 sm:w-48" />
        <Skeleton className="mx-auto mt-5 h-6 w-40" />
        <Skeleton className="mx-auto mt-2 h-4 w-28" />
        <Skeleton className="mx-auto mt-5 h-11 w-full rounded-xl sm:w-40" />
      </GlassCard>
      <GlassCard className="space-y-3 p-6 sm:space-y-5">
        <Skeleton className="mb-3 h-4 w-28" />
        <div className="space-y-3">
          <Repeat count={2}>
            {() => (
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            )}
          </Repeat>
        </div>
        <div className="space-y-2 border-t border-border/70 pt-4">
          <Repeat count={3}>
            {() => (
              <div className="flex justify-between gap-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
            )}
          </Repeat>
        </div>
      </GlassCard>
    </div>
  );
}

/** Contact's email/phone/location cards. */
export function ContactInfoSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-5 sm:gap-8">
      <Repeat count={count}>
        {() => (
          <GlassCard className="flex items-center gap-4 p-5">
            <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-40 max-w-full" />
            </div>
          </GlassCard>
        )}
      </Repeat>
    </div>
  );
}

export function SectionHeadingSkeleton() {
  return (
    <div className="mb-4 space-y-3">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
  );
}

/** Long-form body — blog posts and project case studies share this rhythm. */
export function ArticleSkeleton() {
  return (
    <div className="space-y-4">
      <Repeat count={3}>
        {() => (
          <div className="space-y-2.5 pb-4">
            <Skeleton className="h-6 w-2/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}
      </Repeat>
    </div>
  );
}

/** Detail-page shell: title block, cover, body — shared by the project, blog and job pages while their record loads. */
export function DetailPageSkeleton({ cover = true }: { cover?: boolean }) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <div className="flex flex-wrap gap-2 pt-1">
          <Repeat count={4}>
            {() => <Skeleton className="h-6 w-20 rounded-full" />}
          </Repeat>
        </div>
      </div>
      {cover && <Skeleton className="aspect-video w-full rounded-2xl" />}
      <ArticleSkeleton />
    </div>
  );
}

/** Tool page shell: icon, title and the tool's own working area. */
export function ToolDetailSkeleton() {
  return (
    <>
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="mt-4 h-5 w-2/3" />
      <Skeleton className="mt-8 h-80 w-full rounded-2xl" />
    </>
  );
}

/** Route-level Suspense fallback: heading plus a card grid, the shape most public routes share. */
export function PageSkeleton() {
  return (
    <div className="container-x py-8">
      <SectionHeadingSkeleton />
      <div className="mt-4 grid auto-rows-[1fr] gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ToolCardSkeleton count={6} />
      </div>
    </div>
  );
}
