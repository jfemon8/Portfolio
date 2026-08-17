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
    // Applied before the round trip: on a slow link the icon otherwise sits unchanged long enough to read as a dead button.
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['messages'] });
      const snapshot = qc.getQueriesData<ListResponse<MessageDoc>>({
        queryKey: ['messages'],
      });
      for (const [key, cachedList] of snapshot) {
        if (!cachedList) continue;
        const next = cachedList.data.map((m) =>
          m._id === vars.id ? { ...m, ...vars.body } : m
        );
        qc.setQueryData(key, {
          ...cachedList,
          data: next,
          unread: next.filter((m) => !m.read).length,
        });
      }
      setActive((a) => (a && a._id === vars.id ? { ...a, ...vars.body } : a));
      return { snapshot };
    },
    onError: (err, _vars, context) => {
      // Without this the request could fail silently, which is indistinguishable from the button doing nothing.
      for (const [key, cachedList] of context?.snapshot ?? [])
        qc.setQueryData(key, cachedList);
      qc.invalidateQueries({ queryKey: ['messages'] });
      toast.error((err as ApiError)?.message || 'Could not update the message');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['messages'] });
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

  // Switching filters has to drop the open message: it belongs to the list you just left, so it would otherwise sit there under an empty list.
  const selectFilter = (next: FilterKey): void => {
    setFilter(next);
    setActive(null);
    setReply(null);
  };

  const emptyMessage =
    filter === 'unread'
      ? 'Nothing unread — you are all caught up.'
      : filter === 'starred'
        ? 'No starred messages yet.'
        : filter === 'archived'
          ? 'Nothing archived.'
          : 'No messages yet. Submissions from your contact form land here.';

  const iconBtn =
    'grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:border-primary/40 hover:text-neon';

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle={`Visitor submissions from the Contact form on your public site · ${data?.unread ?? 0} unread`}
      />

      {/* Scrolls instead of wrapping, so the four filters stay on one row on a phone rather than reflowing into a block. */}
      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((ff) => (
          <button
            key={ff.k}
            onClick={() => selectFilter(ff.k)}
            aria-pressed={filter === ff.k}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm backdrop-blur-md backdrop-saturate-150 backdrop-brightness-105 transition-all',
              filter === ff.k
                ? 'border-primary/50 bg-primary/10 text-primary shadow-glow'
                : 'border-border/70 text-muted-foreground hover:border-primary/30 hover:text-foreground'
            )}
          >
            {ff.l}
            {/* Only the unread count is shown, because it is the only one the list endpoint actually returns. */}
            {ff.k === 'unread' && (data?.unread ?? 0) > 0 && (
              <span className="rounded-full bg-neon/15 px-1.5 py-0.5 text-2xs font-semibold text-neon">
                {data?.unread}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
        {/* The list column owns its own loading and empty states; rendering them above the grid stacked an empty card on top of an open message. */}
        <div className={cn('space-y-2', active && 'hidden lg:block')}>
          {isLoading && <Spinner />}
          {!isLoading && messages.length === 0 && (
            <EmptyState message={emptyMessage} />
          )}
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
                  <span className="flex min-w-0 items-center gap-2">
                    {/* An explicit dot, because a left border alone is easy to miss when checking whether a message was opened. */}
                    <span
                      aria-label={m.read ? 'Read' : 'Unread'}
                      className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        m.read ? 'bg-transparent' : 'bg-neon'
                      )}
                    />
                    <span
                      className={cn(
                        'truncate text-foreground',
                        m.read ? 'font-medium' : 'font-bold'
                      )}
                    >
                      {m.name}
                    </span>
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
            <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="break-words text-lg font-bold text-foreground">
                  {active.subject || '(no subject)'}
                </h2>
                <p className="mt-1 break-words text-sm text-muted-foreground">
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
              <div className="flex shrink-0 gap-2">
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
                  className={cn(iconBtn, active.read && 'text-neon')}
                  title={active.read ? 'Mark as unread' : 'Mark as read'}
                >
                  {/* Open envelope means read, closed means unread — the reverse of this read as "nothing happened" on click. */}
                  {active.read ? (
                    <MailOpen className="h-4 w-4" />
                  ) : (
                    <Mail className="h-4 w-4" />
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
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="whitespace-pre-wrap break-words py-5 text-sm leading-relaxed text-muted-foreground">
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
          messages.length > 0 && (
            <GlassCard className="hidden place-items-center p-10 text-muted-foreground/60 lg:grid">
              Select a message to read
            </GlassCard>
          )
        )}
      </div>
    </div>
  );
}
