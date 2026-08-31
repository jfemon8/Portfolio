import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { api } from '@/lib/api';
import PageHeader from '@/components/admin/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Spinner, ErrorState, EmptyState } from '@/components/ui/States';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/date';
import type { AuditAction, AuditLogDoc, PaginatedResponse } from '@/types';

const ACTIONS: (AuditAction | 'all')[] = [
  'all',
  'auth.login',
  'auth.login_failed',
  'auth.refresh',
  'auth.refresh_reuse_detected',
  'auth.logout',
  'auth.password_changed',
  'user.created',
  'user.updated',
  'user.deleted',
  'rbac.denied',
];

const tone = (a: string): string => {
  if (
    a.includes('failed') ||
    a.includes('reuse') ||
    a === 'rbac.denied' ||
    a === 'user.deleted'
  )
    return 'border-destructive/40 bg-destructive/10 text-destructive';
  if (a.startsWith('user.'))
    return 'border-neon-blue/40 bg-neon-blue/10 text-neon-blue';
  return 'border-primary/40 bg-primary/10 text-primary';
};

export default function AuditLogViewer() {
  const [action, setAction] = useState<(typeof ACTIONS)[number]>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['audit', action, page],
    queryFn: async () =>
      (
        await api.get<PaginatedResponse<AuditLogDoc>>(
          `/audit?page=${page}&limit=25${action === 'all' ? '' : `&action=${action}`}`
        )
      ).data,
    placeholderData: keepPreviousData,
  });

  const logs = data?.data ?? [];
  const pg = data?.pagination;

  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle="Super-admin only · security & privileged-action trail."
        action={
          <select
            value={action}
            onChange={(e) => {
              setPage(1);
              setAction(e.target.value as (typeof ACTIONS)[number]);
            }}
            className="input w-auto"
          >
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a === 'all' ? 'All actions' : a}
              </option>
            ))}
          </select>
        }
      />

      {isLoading && <Spinner />}
      {isError && <ErrorState onRetry={() => void refetch()} />}
      {!isLoading && logs.length === 0 && (
        <EmptyState message="No audit entries for this filter." />
      )}

      <div className="space-y-2">
        {logs.map((l) => (
          <GlassCard key={l._id} className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  'rounded-full border px-2.5 py-0.5 font-mono text-2xs backdrop-blur-md backdrop-saturate-150 backdrop-brightness-105',
                  tone(l.action)
                )}
              >
                {l.action}
              </span>
              <span className="text-sm text-foreground">{l.actorEmail}</span>
              <span className="rounded-full border border-border/70 px-2 py-0.5 text-2xs capitalize text-muted-foreground backdrop-blur-md backdrop-saturate-150 backdrop-brightness-105">
                {l.role}
              </span>
              {l.entity && (
                <span className="text-xs text-muted-foreground/70">
                  {l.entity}
                  {l.entityId ? `#${l.entityId.slice(-6)}` : ''}
                </span>
              )}
              <span className="flex items-center gap-2 text-2xs text-muted-foreground/60 sm:ml-auto">
                {l.ip && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" /> {l.ip}
                  </span>
                )}
                {formatDateTime(l.createdAt)}
              </span>
            </div>
            {l.meta && Object.keys(l.meta).length > 0 && (
              <pre className="mt-2 overflow-x-auto rounded-lg border border-border/50 bg-background/40 p-2 font-mono text-2xs text-muted-foreground/80">
                {JSON.stringify(l.meta)}
              </pre>
            )}
          </GlassCard>
        ))}
      </div>

      {pg && pg.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pg.page} / {pg.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pg.pages || isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
