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
  Send,
  Check,
} from 'lucide-react';
import { api } from '@/lib/api';
import PageHeader from '@/components/admin/PageHeader';
import { useConfirm } from '@/components/admin/ConfirmModal';
import GlassCard from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Spinner, EmptyState } from '@/components/ui/States';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime } from '@/lib/date';
import type { ApiError, ItemResponse, ListResponse, MessageDoc } from '@/types';

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
  const [reply, setReply] = useState<{ subject: string; body: string } | null>(
    null
  );

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
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['messages'] });
      // Keep the detail pane in sync.
      setActive((a) => (a && a._id === vars.id ? { ...a, ...vars.body } : a));
    },
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
  const sendReply = useMutation({
    mutationFn: async ({
      id,
      subject,
      body,
    }: {
      id: string;
      subject: string;
      body: string;
    }) =>
      (
        await api.post<ItemResponse<MessageDoc>>(`/messages/${id}/reply`, {
          subject,
          body,
        })
      ).data,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['messages'] });
      setActive((a) => (a && a._id === res.data._id ? res.data : a));
      setReply(null);
      toast.success('Reply sent');
    },
    onError: (e) =>
      toast.error((e as ApiError)?.message || 'Reply could not be sent'),
  });

  const open = (m: MessageDoc): void => {
    setActive(m);
    setReply(null);
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

      <div className="grid gap-4 lg:grid-cols-[23.75rem_1fr]">
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
                  <span className="shrink-0 text-2xs text-muted-foreground/60">
                    {formatDate(m.createdAt)}
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
                  {formatDateTime(active.createdAt)}
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
            <div className="border-t border-border/60 pt-4">
              {active.replied && (
                <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <Check className="h-3.5 w-3.5 text-neon" />
                  Replied
                  {active.repliedAt && ` · ${formatDateTime(active.repliedAt)}`}
                </p>
              )}
              {reply ? (
                <div className="space-y-3">
                  <div>
                    <label className="label">Subject</label>
                    <input
                      className="input"
                      value={reply.subject}
                      onChange={(e) =>
                        setReply({ ...reply, subject: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Reply</label>
                    <textarea
                      rows={6}
                      autoFocus
                      className="input resize-y"
                      placeholder={`Write your reply to ${active.name}…`}
                      value={reply.body}
                      onChange={(e) =>
                        setReply({ ...reply, body: e.target.value })
                      }
                    />
                  </div>
                  <p className="text-2xs text-muted-foreground/70">
                    Sent by email to {active.email}, with the original message
                    quoted below your reply.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        sendReply.mutate({ id: active._id, ...reply })
                      }
                      disabled={!reply.body.trim() || sendReply.isPending}
                    >
                      <Send className="h-4 w-4" />
                      {sendReply.isPending ? 'Sending…' : 'Send reply'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setReply(null)}
                      disabled={sendReply.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() =>
                    setReply({
                      subject: `Re: ${active.subject || 'your message'}`,
                      body: '',
                    })
                  }
                >
                  <Reply className="h-4 w-4" />
                  {active.replied ? 'Reply again' : 'Reply'}
                </Button>
              )}
            </div>
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
