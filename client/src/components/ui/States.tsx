import { AlertTriangle, Inbox } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSiteCopy } from '@/hooks/useSiteCopy';
import BrandMark from '@/components/shared/BrandMark';

export function Spinner({ label }: { label?: string }) {
  const c = useSiteCopy('states', { loading: 'Loading…' });
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-ink-soft">
      <div className="relative h-14 w-14">
        <BrandMark className="h-14 w-14" />
        <svg
          viewBox="0 0 64 64"
          className="absolute inset-0 h-14 w-14 animate-spin motion-reduce:animate-none"
          style={{ animationDuration: '1.1s' }}
          aria-hidden="true"
        >
          <circle
            cx="32"
            cy="32"
            r="30"
            fill="none"
            className="stroke-neon"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="46 142"
          />
        </svg>
      </div>
      <span className="text-sm">{label ?? c.loading}</span>
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const c = useSiteCopy('states', {
    error: 'Failed to load.',
    retry: 'Try again',
  });
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertTriangle className="h-8 w-8 text-neon-pink" strokeWidth={2.25} />
      <p className="text-ink-soft">{message ?? c.error}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-outline mt-1">
          {c.retry}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message?: string }) {
  const c = useSiteCopy('states', { empty: 'Nothing here yet.' });
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-dim">
      <Inbox className="h-8 w-8" strokeWidth={2.25} />
      <p className="text-sm">{message ?? c.empty}</p>
    </div>
  );
}

/** animate-pulse is already reduced-motion-safe via the global safeguard. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-border/50', className)} />
  );
}

/** Content-shaped loading placeholder for the project/blog card grids. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid auto-rows-[1fr] gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border/60 bg-card/40"
        >
          <Skeleton className="aspect-video rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}
