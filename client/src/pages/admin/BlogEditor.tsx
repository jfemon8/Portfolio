import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, Eye, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import ImageUpload from '@/components/admin/ImageUpload';
import Toggle from '@/components/ui/Toggle';
import Markdown from '@/components/ui/Markdown';
import { Spinner } from '@/components/ui/States';
import type { ApiError, BlogPostDoc, ItemResponse } from '@/types';

type BlogForm = Partial<BlogPostDoc>;

const empty: BlogForm = {
  title: '',
  excerpt: '',
  content: '',
  coverImage: '',
  coverPublicId: '',
  tags: [],
  category: 'General',
  status: 'draft',
  featured: false,
};

export default function BlogEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState<BlogForm>(empty);
  const [preview, setPreview] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['blog', 'admin', id],
    queryFn: async () =>
      (await api.get<ItemResponse<BlogPostDoc>>(`/blog/admin/${id}`)).data,
    enabled: !!id,
  });

  useEffect(() => {
    if (data?.data) setF(data.data);
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

  if (id && isLoading) return <Spinner />;

  const set = <K extends keyof BlogForm>(k: K, v: BlogForm[K]): void =>
    setF((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate('/admin/blog')}
          className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-neon"
        >
          <ArrowLeft className="h-4 w-4" /> Back to posts
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setPreview((p) => !p)}
            className="btn-outline"
          >
            <Eye className="h-4 w-4" /> {preview ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={() => save.mutate(f)}
            disabled={save.isPending || !f.title}
            className="btn-primary"
          >
            {save.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="glass space-y-4 p-6">
          {preview ? (
            <article>
              <h1 className="text-3xl font-extrabold">
                {f.title || 'Untitled'}
              </h1>
              <p className="mt-2 text-ink-soft">{f.excerpt}</p>
              <hr className="my-6 border-line" />
              <Markdown>{f.content}</Markdown>
            </article>
          ) : (
            <>
              <div>
                <label className="label">Title</label>
                <input
                  className="input text-lg"
                  value={f.title ?? ''}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="An awesome post title"
                />
              </div>
              <div>
                <label className="label">Excerpt</label>
                <textarea
                  rows={2}
                  className="input resize-none"
                  value={f.excerpt ?? ''}
                  onChange={(e) => set('excerpt', e.target.value)}
                  placeholder="Short summary shown on cards"
                />
              </div>
              <div>
                <label className="label">Content (Markdown)</label>
                <textarea
                  rows={20}
                  className="input resize-y font-mono text-sm"
                  value={f.content ?? ''}
                  onChange={(e) => set('content', e.target.value)}
                  placeholder={'# Heading\n\nWrite your article in **Markdown**…'}
                />
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass space-y-4 p-6">
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
                <option value="published">Published</option>
              </select>
            </div>
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
                value={(f.tags ?? []).join(', ')}
                onChange={(e) =>
                  set(
                    'tags',
                    e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
              />
            </div>
            <div className="flex items-center gap-3">
              <Toggle
                checked={Boolean(f.featured)}
                onChange={(v) => set('featured', v)}
              />
              <span className="text-sm text-ink-soft">Featured post</span>
            </div>
          </div>

          <div className="glass p-6">
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
          </div>
        </div>
      </div>
    </div>
  );
}
