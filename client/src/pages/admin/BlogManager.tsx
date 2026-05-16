import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Eye, Globe, FileEdit } from 'lucide-react';
import { api } from '@/lib/api';
import PageHeader from '@/components/admin/PageHeader';
import { Spinner, ErrorState, EmptyState } from '@/components/ui/States';
import type { BlogPostDoc, BlogStatus, ListResponse } from '@/types';

export default function BlogManager() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['blog', 'admin'],
    queryFn: async () =>
      (await api.get<ListResponse<BlogPostDoc>>('/blog/admin/all')).data,
  });
  const posts = data?.data ?? [];

  const toggle = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BlogStatus }) =>
      (await api.put(`/blog/${id}`, { status })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blog'] });
      toast.success('Status updated');
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/blog/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blog'] });
      toast.success('Post deleted');
    },
  });

  return (
    <div>
      <PageHeader
        title="Blog"
        subtitle="Write and manage articles."
        action={
          <Link to="/admin/blog/new" className="btn-primary">
            <Plus className="h-4 w-4" /> New post
          </Link>
        }
      />

      {isLoading && <Spinner />}
      {isError && <ErrorState onRetry={() => void refetch()} />}
      {!isLoading && posts.length === 0 && (
        <EmptyState message="No posts yet — write your first article!" />
      )}

      <div className="space-y-3">
        {posts.map((p) => (
          <div
            key={p._id}
            className="glass flex flex-wrap items-center justify-between gap-4 p-4"
          >
            <div className="min-w-0">
              <p className="font-semibold text-ink">
                {p.title}
                <span
                  className={`ml-2 align-middle text-[11px] ${
                    p.status === 'published' ? 'text-neon' : 'text-ink-dim'
                  }`}
                >
                  ● {p.status}
                </span>
              </p>
              <p className="text-xs text-ink-dim">
                {p.readingTime} min · {p.views} views · /{p.slug}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() =>
                  toggle.mutate({
                    id: p._id,
                    status: p.status === 'published' ? 'draft' : 'published',
                  })
                }
                title={p.status === 'published' ? 'Unpublish' : 'Publish'}
                className="rounded-lg border border-line p-2 text-ink-soft hover:border-neon/40 hover:text-neon"
              >
                {p.status === 'published' ? (
                  <FileEdit className="h-4 w-4" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
              </button>
              {p.status === 'published' && (
                <a
                  href={`/blog/${p.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-line p-2 text-ink-soft hover:border-neon/40 hover:text-neon"
                >
                  <Eye className="h-4 w-4" />
                </a>
              )}
              <Link
                to={`/admin/blog/${p._id}/edit`}
                className="rounded-lg border border-line p-2 text-ink-soft hover:border-neon/40 hover:text-neon"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <button
                onClick={() =>
                  window.confirm(`Delete "${p.title}"?`) && del.mutate(p._id)
                }
                className="rounded-lg border border-line p-2 text-ink-soft hover:border-neon-pink/40 hover:text-neon-pink"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
