import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Bot, CalendarClock, Hand } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/cn';
import type { ListResponse, JobSyncRun } from '@/types';

/** The nightly schedule, shown only as a fallback until a real run has been recorded. */
const SCHEDULE = 'Runs nightly at 11:45 PM (Asia/Dhaka)';

const seconds = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

function TriggerBadge({ trigger }: { trigger: JobSyncRun['trigger'] }) {
  const automatic = trigger === 'automatic';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-medium',
        automatic
          ? 'border-neon/40 bg-neon/10 text-neon'
          : 'border-border/70 text-muted-foreground'
      )}
    >
      {automatic ? (
        <CalendarClock className="h-3 w-3" />
      ) : (
        <Hand className="h-3 w-3" />
      )}
      {automatic ? 'Automatic' : 'Manual'}
    </span>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'good' | 'warn';
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-bg-elevated/40 px-3 py-2">
      <p
        className={cn(
          'text-lg font-bold tabular-nums',
          tone === 'good' && 'text-neon',
          tone === 'warn' && 'text-amber-500',
          !tone && 'text-foreground'
        )}
      >
        {value}
      </p>
      <p className="text-2xs text-muted-foreground">{label}</p>
    </div>
  );
}

/** Replaces the fixed description of what the agent does with what it actually did. */
export default function JobSyncHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ['job-sync-runs'],
    queryFn: async () =>
      (await api.get<ListResponse<JobSyncRun>>('/jobs/admin/runs')).data,
  });

  const runs = data?.data ?? [];
  const last = runs[0];

  if (isLoading)
    return (
      <p className="mt-1 text-xs text-muted-foreground">Loading last run…</p>
    );

  // Nothing has run yet, so the schedule is the only thing that can honestly be stated.
  if (!last)
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        {SCHEDULE} · No run recorded yet.
      </p>
    );

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <TriggerBadge trigger={last.trigger} />
        <span className="text-foreground">
          {formatDateTime(last.finishedAt)}
        </span>
        <span>· {seconds(last.durationMs)}</span>
        <span>· {last.feeds} sources</span>
        {last.scopedDb ? (
          <span className="text-neon">· Scoped DB user</span>
        ) : (
          <span className="text-amber-500">· App DB credential</span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="New jobs added" value={last.added} tone="good" />
        <Stat label="Updated" value={last.updated} />
        <Stat label="Unique after merge" value={last.unique} />
        <Stat label="Duplicates merged" value={last.duplicatesMerged} />
        <Stat
          label="Removed (deadline passed)"
          value={last.expiredRemoved}
          tone="warn"
        />
        <Stat label="Scanned" value={last.scanned} />
      </div>

      {last.failures.length > 0 && (
        <p className="mt-2 flex items-start gap-1.5 text-2xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {last.failures.length} source(s) failed: {last.failures.join(', ')}
        </p>
      )}
      {last.warnings.length > 0 && (
        <p className="mt-1 text-2xs text-amber-500">
          {last.warnings.join(' · ')}
        </p>
      )}

      {runs.length > 1 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-2xs text-muted-foreground hover:text-foreground">
            Previous {runs.length - 1} run(s)
          </summary>
          <ul className="mt-2 space-y-1">
            {runs.slice(1).map((run) => (
              <li
                key={run._id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border/60 px-3 py-1.5 text-2xs text-muted-foreground"
              >
                <TriggerBadge trigger={run.trigger} />
                <span>{formatDateTime(run.finishedAt)}</span>
                <span className="ml-auto">
                  +{run.added} added · −{run.expiredRemoved} expired ·{' '}
                  {seconds(run.durationMs)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-2xs text-muted-foreground/70">
        <Bot className="h-3 w-3" /> {SCHEDULE}
      </p>
    </div>
  );
}
