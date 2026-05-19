import { Loader2, AlertTriangle, Inbox } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-ink-soft">
      <Loader2 className="h-7 w-7 animate-spin text-neon" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Failed to load.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertTriangle className="h-8 w-8 text-neon-pink" />
      <p className="text-ink-soft">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-outline mt-1">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  message = 'Nothing here yet.',
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-dim">
      <Inbox className="h-8 w-8" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

/**
 * Base shimmer block (project rule #3/#5). `animate-pulse` is already
 * reduced-motion-safe via the global P5.3 safeguard.
 */
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
