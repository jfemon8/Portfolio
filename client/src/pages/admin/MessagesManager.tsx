import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Mail,
  MailOpen,
  Star,
  Trash2,
  Archive,
  Reply,
  ChevronLeft,
} from 'lucide-react';
import { api } from '@/lib/api';
import PageHeader from '@/components/admin/PageHeader';
import { useConfirm } from '@/components/admin/ConfirmModal';
import GlassCard from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Spinner, EmptyState } from '@/components/ui/States';
import { cn } from '@/lib/cn';
import type { ListResponse, MessageDoc } from '@/types';

type FilterKey = 'all' | 'unread' | 'starred' | 'archived';

const filters: { k: FilterKey; l: string }[] = [
  { k: 'all', l: 'All' },
  { k: 'unread', l: 'Unread' },
  { k: 'starred', l: 'Starred' },
  { k: 'archived', l: 'Archived' },
];

export default function MessagesManager() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [active, setActive] = useState<MessageDoc | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['messages', filter],
    queryFn: async () =>
      (await api.get<ListResponse<MessageDoc>>(`/messages?filter=${filter}`))
        .data,
  });
  const messages = data?.data ?? [];

  const patch = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: Partial<Pick<MessageDoc, 'read' | 'starred' | 'archived'>>;
    }) => (await api.patch(`/messages/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) =>
      (await api.delete(`/messages/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Deleted');
      setActive(null);
    },
  });

  const open = (m: MessageDoc): void => {
    setActive(m);
    if (!m.read) patch.mutate({ id: m._id, body: { read: true } });
  };

  const iconBtn =
    'rounded-lg border border-border/70 p-2.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-neon';

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle={`Visitor submissions from the Contact form on your public site · ${data?.unread ?? 0} unread`}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((ff) => (
          <button
            key={ff.k}
            onClick={() => setFilter(ff.k)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm transition-all',
              filter === ff.k
                ? 'border-primary/50 bg-primary/10 text-primary shadow-glow'
                : 'border-border/70 text-muted-foreground hover:text-foreground'
            )}
          >
            {ff.l}
          </button>
        ))}
      </div>

      {isLoading && <Spinner />}
      {!isLoading && messages.length === 0 && (
        <EmptyState message="No messages here." />
      )}

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className={cn('space-y-2', active && 'hidden lg:block')}>
          {messages.map((m) => (
            <button
              key={m._id}
              onClick={() => open(m)}
              className="block w-full text-left"
            >
              <GlassCard
                className={cn(
                  'p-4 transition-colors',
                  active?._id === m._id && 'border-primary/50',
                  !m.read && 'border-l-2 border-l-neon'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-foreground">
                    {m.name}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground/60">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground/70">
                  {m.email}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {m.subject || m.message}
                </p>
              </GlassCard>
            </button>
          ))}
        </div>

        {active ? (
          <GlassCard className="h-fit p-4 sm:p-6">
            <button
              onClick={() => setActive(null)}
              className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            >
              <ChevronLeft className="h-4 w-4" /> Back to messages
            </button>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {active.subject || '(no subject)'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {active.name} ·{' '}
                  <a
                    href={`mailto:${active.email}`}
                    className="text-neon hover:underline"
                  >
                    {active.email}
                  </a>
                </p>
                <p className="text-xs text-muted-foreground/60">
                  {new Date(active.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    patch.mutate({
                      id: active._id,
                      body: { starred: !active.starred },
                    })
                  }
                  className={iconBtn}
                  title="Star"
                >
                  <Star
                    className={cn(
                      'h-4 w-4',
                      active.starred && 'fill-neon text-neon'
                    )}
                  />
                </button>
                <button
                  onClick={() =>
                    patch.mutate({
                      id: active._id,
                      body: { read: !active.read },
                    })
                  }
                  className={iconBtn}
                  title="Toggle read"
                >
                  {active.read ? (
                    <Mail className="h-4 w-4" />
                  ) : (
                    <MailOpen className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() =>
                    patch.mutate({
                      id: active._id,
                      body: { archived: !active.archived },
                    })
                  }
                  className={iconBtn}
                  title="Archive"
                >
                  <Archive className="h-4 w-4" />
                </button>
                <button
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Delete message?',
                      message: `Message from ${active.name} will be permanently removed. This cannot be undone.`,
                      confirmLabel: 'Delete',
                      variant: 'danger',
                    });
                    if (ok) del.mutate(active._id);
                  }}
                  className="rounded-lg border border-border/70 p-2.5 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="whitespace-pre-wrap py-5 text-sm leading-relaxed text-muted-foreground">
              {active.message}
            </p>
            <a
              href={`mailto:${active.email}?subject=Re: ${encodeURIComponent(
                active.subject || ''
              )}`}
            >
              <Button>
                <Reply className="h-4 w-4" /> Reply by email
              </Button>
            </a>
          </GlassCard>
        ) : (
          <GlassCard className="hidden place-items-center p-10 text-muted-foreground/60 lg:grid">
            Select a message to read
          </GlassCard>
        )}
      </div>
    </div>
  );
}
