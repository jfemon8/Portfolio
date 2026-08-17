import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  CircleSlash,
  Globe,
  Rss,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import JobSyncHistory from '@/components/admin/JobSyncHistory';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/cn';
import type {
  ItemResponse,
  ListResponse,
  JobSourceDiagnostic,
  JobSyncResult,
} from '@/types';

/** A full run crawls dozens of sources, well past the shared 20s client budget. */
const SYNC_TIMEOUT_MS = 180_000;

const STATUS_STYLE: Record<
  JobSourceDiagnostic['status'],
  { label: string; className: string }
> = {
  healthy: { label: 'Healthy', className: 'text-neon' },
  empty: { label: 'No results', className: 'text-amber-500' },
  failing: { label: 'Failing', className: 'text-destructive' },
  resting: { label: 'Resting', className: 'text-amber-500' },
  unknown: { label: 'Not run yet', className: 'text-muted-foreground' },
};

function StatusIcon({ status }: { status: JobSourceDiagnostic['status'] }) {
  if (status === 'healthy')
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-neon" />;
  if (status === 'resting')
    return <CircleSlash className="h-4 w-4 shrink-0 text-amber-500" />;
  if (status === 'unknown')
    return <Bot className="h-4 w-4 shrink-0 text-muted-foreground" />;
  return (
    <AlertTriangle
      className={cn(
        'h-4 w-4 shrink-0',
        status === 'empty' ? 'text-amber-500' : 'text-destructive'
      )}
    />
  );
}

function SyncSummary({ result }: { result: JobSyncResult }) {
  const stats = [
    ['Added', result.added],
    ['Updated', result.updated],
    ['Duplicates merged', result.duplicatesMerged],
    ['Expired removed', result.expiredRemoved],
    ['Outside window', result.skipped],
    ['Stale purged', result.purged],
  ] as const;

  return (
    <div className="mt-4 border-t border-border/60 pt-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-sm font-semibold text-foreground">
          Last run · {(result.durationMs / 1000).toFixed(1)}s
        </span>
        <span className="text-xs text-muted-foreground">
          {result.scanned} scanned → {result.unique} unique
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium',
            result.scopedDb
              ? 'bg-neon/10 text-neon'
              : 'bg-amber-500/10 text-amber-500'
          )}
        >
          <ShieldCheck className="h-3 w-3" />
          {result.scopedDb ? 'Restricted DB user' : 'Full DB credential'}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {stats.map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-2"
          >
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-semibold tabular-nums text-foreground">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {result.warnings.length > 0 && (
        <ul className="mt-3 space-y-1">
          {result.warnings.map((warning) => (
            <li key={warning} className="text-xs text-amber-500">
              {warning}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Diagnosis surface for the ingestion agent — which sources ran, which broke, what it wrote. */
export default function JobAgentPanel() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<JobSyncResult | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['jobs/admin/health'],
    queryFn: async () =>
      (await api.get<ListResponse<JobSourceDiagnostic>>('/jobs/admin/health'))
        .data,
  });
  const sources = data?.data ?? [];

  const refresh = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['jobs/admin'] }),
      queryClient.invalidateQueries({ queryKey: ['jobs/admin/health'] }),
      // The run this sync just recorded is what the history panel reads.
      queryClient.invalidateQueries({ queryKey: ['job-sync-runs'] }),
      queryClient.invalidateQueries({ queryKey: ['jobs'] }),
    ]);
  };

  const sync = async (): Promise<void> => {
    setSyncing(true);
    try {
      const { data: body } = await api.post<ItemResponse<JobSyncResult>>(
        '/jobs/admin/sync',
        undefined,
        // A full run crawls dozens of sources; the shared 20s budget is for normal calls.
        { timeout: SYNC_TIMEOUT_MS }
      );
      setResult(body.data);
      await refresh();
      toast.success(
        `${body.data.added} added, ${body.data.updated} updated, ${body.data.duplicatesMerged} duplicates merged`
      );
      if (body.data.failures.length) {
        toast.error(
          `${body.data.failures.length} source${body.data.failures.length === 1 ? '' : 's'} failed — see the panel.`
        );
      }
    } catch (error) {
      const failure = error as { status?: number; message?: string };
      if (failure.status === undefined) {
        // The server does not stop when the browser gives up, so the run is still finishing.
        toast('Still running on the server — refreshing shortly.', {
          icon: '⏳',
        });
        window.setTimeout(() => void refresh(), 30_000);
      } else {
        toast.error(failure.message || 'Sync failed.');
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <GlassCard className="mb-6 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <Bot className="h-4 w-4 text-neon" /> Ingestion agent
          </h2>
        </div>
        <Button
          variant="secondary"
          onClick={() => void sync()}
          disabled={syncing}
        >
          <RefreshCw className={syncing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          {syncing ? 'Running…' : 'Run now'}
        </Button>
      </div>

      <JobSyncHistory />

      {isLoading && (
        <p className="mt-4 text-xs text-muted-foreground">Loading sources…</p>
      )}

      {sources.length > 0 && (
        <ul className="mt-4 space-y-2">
          {sources.map((source) => (
            <li
              key={source.key}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border/60 px-3 py-2"
            >
              <StatusIcon status={source.status} />
              {source.kind === 'crawler' ? (
                <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <Rss className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="font-medium text-foreground">{source.name}</span>
              <span
                className={cn('text-xs', STATUS_STYLE[source.status].className)}
              >
                {STATUS_STYLE[source.status].label}
              </span>
              <span className="ml-auto text-2xs text-muted-foreground">
                {source.lastRunAt
                  ? `${source.lastScanned} found · ${(source.lastDurationMs / 1000).toFixed(1)}s · ${formatDateTime(source.lastRunAt)}`
                  : 'never run'}
              </span>
              {source.lastError && (
                <span className="w-full text-2xs text-destructive">
                  {source.lastError}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {result && <SyncSummary result={result} />}
    </GlassCard>
  );
}
