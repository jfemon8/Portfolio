import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import ImageUpload from '@/components/admin/ImageUpload';
import RichTextEditor from '@/components/admin/RichTextEditor';
import GlassCard from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/States';
import type { ApiError, BlogPostDoc, ItemResponse } from '@/types';

type BlogForm = Partial<BlogPostDoc>;

/** Format an ISO instant as a `datetime-local` value in the admin's LOCAL wall-clock time (the input has no timezone; `toISOString` would show UTC and misrepresent the scheduled time for non-UTC admins). */
const toLocalInput = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

const empty: BlogForm = {
  title: '',
  content: '',
  coverImage: '',
  coverPublicId: '',
  tags: [],
  category: 'General',
  status: 'draft',
};

export default function BlogEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState<BlogForm>(empty);
  const [tagsText, setTagsText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['blog', 'admin', id],
    queryFn: async () =>
      (await api.get<ItemResponse<BlogPostDoc>>(`/blog/admin/${id}`)).data,
    enabled: !!id,
  });

  useEffect(() => {
    if (!data?.data) return;
    setF(data.data);
    setTagsText((data.data.tags ?? []).join(','));
  }, [data]);

  const save = useMutation({
    mutationFn: async (body: BlogForm) =>
      id
        ? (await api.put(`/blog/${id}`, body)).data
        : (await api.post('/blog', body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blog'] });
      toast.success(id ? 'Post updated' : 'Post created');
      navigate('/admin/blog');
    },
    onError: (e) => toast.error((e as ApiError).message || 'Save failed'),
  });

  const submit = (): void => {
    save.mutate({
      ...f,
      tags: tagsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  if (id && isLoading) return <Spinner />;

  const set = <K extends keyof BlogForm>(k: K, v: BlogForm[K]): void =>
    setF((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
        <button
          onClick={() => navigate('/admin/blog')}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-neon"
        >
          <ArrowLeft className="h-4 w-4" /> Back to posts
        </button>
        <Button onClick={submit} disabled={save.isPending || !f.title}>
          {save.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <GlassCard className="space-y-4 p-2 md:p-4">
          <div>
            <label className="label">Title</label>
            <input
              className="input text-base"
              value={f.title ?? ''}
              onChange={(e) => set('title', e.target.value)}
              placeholder="An awesome post title"
            />
          </div>
          <div>
            <label className="label">Content</label>
            <RichTextEditor
              value={f.content ?? ''}
              onChange={(v) => set('content', v)}
              stickyToolbar
            />
          </div>
        </GlassCard>

        <div className="space-y-4 sm:space-y-6">
          <GlassCard className="space-y-4 p-6">
            <h3 className="font-semibold text-neon">Settings</h3>
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={f.status}
                onChange={(e) =>
                  set('status', e.target.value as BlogForm['status'])
                }
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
              </select>
            </div>
            {f.status === 'scheduled' && (
              <div>
                <label className="label">Publish at</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={toLocalInput(f.scheduledFor)}
                  onChange={(e) =>
                    set(
                      'scheduledFor',
                      e.target.value
                        ? new Date(e.target.value).toISOString()
                        : undefined
                    )
                  }
                />
                <p className="mt-1 text-2xs text-muted-foreground/70">
                  Goes public automatically at this time.
                </p>
              </div>
            )}
            <div>
              <label className="label">Category</label>
              <input
                className="input"
                value={f.category ?? ''}
                onChange={(e) => set('category', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Tags (comma separated)</label>
              <input
                className="input"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
              />
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <ImageUpload
              label="Cover image"
              value={f.coverImage}
              publicId={f.coverPublicId}
              folder="portfolio/blog"
              onChange={({ url, publicId }) => {
                set('coverImage', url);
                set('coverPublicId', publicId);
              }}
            />
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
