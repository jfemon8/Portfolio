import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Mail, MailOpen, Star, Trash2, Archive, Reply } from 'lucide-react';
import { api } from '@/lib/api';
import PageHeader from '@/components/admin/PageHeader';
import { Spinner, EmptyState } from '@/components/ui/States';
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

  return (
    <div>
      <PageHeader title="Messages" subtitle={`${data?.unread ?? 0} unread`} />

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((ff) => (
          <button
            key={ff.k}
            onClick={() => setFilter(ff.k)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              filter === ff.k
                ? 'border-neon/50 bg-neon/10 text-neon'
                : 'border-line text-ink-soft hover:text-ink'
            }`}
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
        <div className="space-y-2">
          {messages.map((m) => (
            <button
              key={m._id}
              onClick={() => open(m)}
              className={`glass w-full p-4 text-left transition-colors ${
                active?._id === m._id ? 'border-neon/50' : ''
              } ${!m.read ? 'border-l-2 border-l-neon' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold text-ink">
                  {m.name}
                </span>
                <span className="shrink-0 text-[11px] text-ink-dim">
                  {new Date(m.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="truncate text-xs text-ink-dim">{m.email}</p>
              <p className="mt-1 truncate text-sm text-ink-soft">
                {m.subject || m.message}
              </p>
            </button>
          ))}
        </div>

        {active ? (
          <div className="glass h-fit p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
              <div>
                <h2 className="text-lg font-bold text-ink">
                  {active.subject || '(no subject)'}
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {active.name} ·{' '}
                  <a href={`mailto:${active.email}`} className="text-neon">
                    {active.email}
                  </a>
                </p>
                <p className="text-xs text-ink-dim">
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
                  className="rounded-lg border border-line p-2 text-ink-soft hover:text-neon"
                  title="Star"
                >
                  <Star
                    className={`h-4 w-4 ${
                      active.starred ? 'fill-neon text-neon' : ''
                    }`}
                  />
                </button>
                <button
                  onClick={() =>
                    patch.mutate({
                      id: active._id,
                      body: { read: !active.read },
                    })
                  }
                  className="rounded-lg border border-line p-2 text-ink-soft hover:text-neon"
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
                  className="rounded-lg border border-line p-2 text-ink-soft hover:text-neon"
                  title="Archive"
                >
                  <Archive className="h-4 w-4" />
                </button>
                <button
                  onClick={() =>
                    window.confirm('Delete this message?') &&
                    del.mutate(active._id)
                  }
                  className="rounded-lg border border-line p-2 text-ink-soft hover:text-neon-pink"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="whitespace-pre-wrap py-5 text-sm leading-relaxed text-ink-soft">
              {active.message}
            </p>
            <a
              href={`mailto:${active.email}?subject=Re: ${encodeURIComponent(
                active.subject || ''
              )}`}
              className="btn-primary"
            >
              <Reply className="h-4 w-4" /> Reply by email
            </a>
          </div>
        ) : (
          <div className="glass hidden place-items-center p-10 text-ink-dim lg:grid">
            Select a message to read
          </div>
        )}
      </div>
    </div>
  );
}
