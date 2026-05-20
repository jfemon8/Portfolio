import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, Save, FileUp, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import PageHeader from '@/components/admin/PageHeader';
import ImageUpload from '@/components/admin/ImageUpload';
import Toggle from '@/components/ui/Toggle';
import GlassCard from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
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

  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]): void =>
    setF((p) => (p ? { ...p, [k]: v } : p));

  const setArr = (
    key: ArrayKey,
    idx: number,
    field: string,
    val: string
  ): void =>
    setF((p) => {
      if (!p) return p;
      const arr = [...(p[key] as unknown as Record<string, string>[])];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...p, [key]: arr };
    });

  const addArr = (key: ArrayKey, obj: Record<string, string>): void =>
    setF((p) => (p ? { ...p, [key]: [...(p[key] as unknown[]), obj] } : p));

  const delArr = (key: ArrayKey, idx: number): void =>
    setF((p) =>
      p ? { ...p, [key]: (p[key] as unknown[]).filter((_, i) => i !== idx) } : p
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
    ['codeforcesHandle', 'Codeforces handle'],
    ['leetcodeHandle', 'LeetCode handle'],
    ['codechefHandle', 'CodeChef handle'],
  ];

  return (
    <form onSubmit={submit}>
      <PageHeader
        title="Profile"
        subtitle="Your name, title, tagline, avatar, resume, social links, languages and hero stats — used in the Hero (top of homepage), the About section and the Contact section on the public site."
        action={
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save changes
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="space-y-4 p-6">
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
            <span className="text-sm text-muted-foreground">
              Available for opportunities
            </span>
          </div>
        </GlassCard>

        <div className="space-y-4 sm:space-y-6">
          <GlassCard className="space-y-4 p-6">
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
                  className="mb-2 block truncate text-xs text-neon hover:underline"
                >
                  {f.resumeUrl}
                </a>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary">
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
          </GlassCard>

          <ArrayEditor
            title="Social links"
            items={f.socials as unknown as Record<string, string>[]}
            cols={[
              ['label', 'Label'],
              ['url', 'URL'],
              ['icon', 'Icon (github/linkedin/mail/code)'],
            ]}
            onChange={(i, k, v) => setArr('socials', i, k, v)}
            onAdd={() =>
              addArr('socials', { label: '', url: '', icon: 'code' })
            }
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
    <GlassCard className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-neon">{title}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAdd}
          className="text-xs"
        >
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-end">
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
              className="mb-0.5 rounded-lg border border-border/70 p-2.5 text-muted-foreground/70 transition-colors hover:border-destructive/40 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground/70">None yet.</p>
        )}
      </div>
    </GlassCard>
  );
}
