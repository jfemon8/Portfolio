import { Loader2, AlertTriangle, Inbox } from 'lucide-react';

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
