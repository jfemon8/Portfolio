import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, Save, FileUp, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import PageHeader from '@/components/admin/PageHeader';
import ImageUpload from '@/components/admin/ImageUpload';
import Toggle from '@/components/ui/Toggle';
import { Spinner } from '@/components/ui/States';
import type { ApiError, ItemResponse, ProfileDoc } from '@/types';

type ProfileForm = ProfileDoc;
type ArrayKey = 'socials' | 'stats' | 'languages';

export default function ProfileManager() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () =>
      (await api.get<ItemResponse<ProfileDoc>>('/profile')).data,
  });
  const [f, setF] = useState<ProfileForm | null>(null);
  const [resumeBusy, setResumeBusy] = useState(false);

  useEffect(() => {
    if (data?.data) setF(data.data);
  }, [data]);

  const save = useMutation({
    mutationFn: async (body: ProfileForm) =>
      (await api.put('/profile', body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile saved');
    },
    onError: (e) => toast.error((e as ApiError).message || 'Save failed'),
  });

  if (isLoading || !f) return <Spinner />;

  const set = <K extends keyof ProfileForm>(
    k: K,
    v: ProfileForm[K]
  ): void => setF((p) => (p ? { ...p, [k]: v } : p));

  const setArr = (
    key: ArrayKey,
    idx: number,
    field: string,
    val: string
  ): void =>
    setF((p) => {
      if (!p) return p;
      const arr = [
        ...(p[key] as unknown as Record<string, string>[]),
      ];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...p, [key]: arr };
    });

  const addArr = (key: ArrayKey, obj: Record<string, string>): void =>
    setF((p) =>
      p ? { ...p, [key]: [...(p[key] as unknown[]), obj] } : p
    );

  const delArr = (key: ArrayKey, idx: number): void =>
    setF((p) =>
      p
        ? { ...p, [key]: (p[key] as unknown[]).filter((_, i) => i !== idx) }
        : p
    );

  const uploadResume = async (file?: File): Promise<void> => {
    if (!file) return;
    setResumeBusy(true);
    try {
      const fd = new FormData();
      fd.append('resume', file);
      const { data: res } = await api.post<{ url: string; publicId: string }>(
        '/upload/resume',
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      set('resumeUrl', res.url);
      set('resumePublicId', res.publicId);
      toast.success('Resume uploaded');
    } catch (err) {
      toast.error((err as ApiError).message || 'Resume upload failed');
    } finally {
      setResumeBusy(false);
    }
  };

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    save.mutate(f);
  };

  const basics: [keyof ProfileForm, string][] = [
    ['name', 'Full name'],
    ['title', 'Title'],
    ['tagline', 'Tagline'],
    ['location', 'Location'],
    ['email', 'Email'],
    ['phone', 'Phone'],
  ];

  return (
    <form onSubmit={submit}>
      <PageHeader
        title="Profile"
        subtitle="The identity shown in the hero, about and contact sections."
        action={
          <button className="btn-primary" disabled={save.isPending}>
            {save.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save changes
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass space-y-4 p-6">
          <h3 className="font-semibold text-neon">Basics</h3>
          {basics.map(([k, label]) => (
            <div key={k}>
              <label className="label">{label}</label>
              <input
                className="input"
                value={String(f[k] ?? '')}
                onChange={(e) =>
                  set(k, e.target.value as ProfileForm[typeof k])
                }
              />
            </div>
          ))}
          <div>
            <label className="label">Summary / About</label>
            <textarea
              rows={6}
              className="input resize-y"
              value={f.summary}
              onChange={(e) => set('summary', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Hero roles (one per line)</label>
            <textarea
              rows={4}
              className="input resize-y font-mono text-xs"
              value={f.roles.join('\n')}
              onChange={(e) =>
                set(
                  'roles',
                  e.target.value
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Toggle
              checked={f.available}
              onChange={(v) => set('available', v)}
            />
            <span className="text-sm text-ink-soft">
              Available for opportunities
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass space-y-4 p-6">
            <h3 className="font-semibold text-neon">Avatar & Resume</h3>
            <ImageUpload
              label="Avatar"
              value={f.avatar}
              publicId={f.avatarPublicId}
              folder="portfolio/profile"
              onChange={({ url, publicId }) => {
                set('avatar', url);
                set('avatarPublicId', publicId);
              }}
            />
            <div>
              <label className="label">Resume (PDF)</label>
              {f.resumeUrl && (
                <a
                  href={f.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-2 block truncate text-xs text-neon"
                >
                  {f.resumeUrl}
                </a>
              )}
              <label className="btn-outline cursor-pointer">
                {resumeBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileUp className="h-4 w-4" />
                )}
                Upload resume PDF
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => uploadResume(e.target.files?.[0])}
                />
              </label>
            </div>
          </div>

          <ArrayEditor
            title="Social links"
            items={f.socials as unknown as Record<string, string>[]}
            cols={[
              ['label', 'Label'],
              ['url', 'URL'],
              ['icon', 'Icon (github/linkedin/mail/code)'],
            ]}
            onChange={(i, k, v) => setArr('socials', i, k, v)}
            onAdd={() => addArr('socials', { label: '', url: '', icon: 'code' })}
            onDelete={(i) => delArr('socials', i)}
          />
          <ArrayEditor
            title="Stats (hero terminal)"
            items={f.stats as unknown as Record<string, string>[]}
            cols={[
              ['label', 'Label'],
              ['value', 'Value'],
            ]}
            onChange={(i, k, v) => setArr('stats', i, k, v)}
            onAdd={() => addArr('stats', { label: '', value: '' })}
            onDelete={(i) => delArr('stats', i)}
          />
          <ArrayEditor
            title="Languages"
            items={f.languages as unknown as Record<string, string>[]}
            cols={[
              ['name', 'Language'],
              ['level', 'Level'],
            ]}
            onChange={(i, k, v) => setArr('languages', i, k, v)}
            onAdd={() => addArr('languages', { name: '', level: '' })}
            onDelete={(i) => delArr('languages', i)}
          />
        </div>
      </div>
    </form>
  );
}

interface ArrayEditorProps {
  title: string;
  items: Record<string, string>[];
  cols: [string, string][];
  onChange: (idx: number, key: string, value: string) => void;
  onAdd: () => void;
  onDelete: (idx: number) => void;
}

function ArrayEditor({
  title,
  items,
  cols,
  onChange,
  onAdd,
  onDelete,
}: ArrayEditorProps) {
  return (
    <div className="glass p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-neon">{title}</h3>
        <button
          type="button"
          onClick={onAdd}
          className="btn-ghost px-2 py-1 text-xs"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="flex items-end gap-2">
            {cols.map(([key, label]) => (
              <div key={key} className="flex-1">
                <label className="label">{label}</label>
                <input
                  className="input"
                  value={it[key] || ''}
                  onChange={(e) => onChange(i, key, e.target.value)}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => onDelete(i)}
              className="mb-0.5 rounded-lg border border-line p-2.5 text-ink-dim hover:text-neon-pink"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-ink-dim">None yet.</p>
        )}
      </div>
    </div>
  );
}
