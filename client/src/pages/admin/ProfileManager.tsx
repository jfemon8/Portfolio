import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus,
  Trash2,
  Save,
  FileUp,
  Loader2,
  Eye,
  Download,
} from 'lucide-react';
import { api } from '@/lib/api';
import { proxyFileUrl } from '@/lib/fileProxy';
import PageHeader from '@/components/admin/PageHeader';
import ImageUpload from '@/components/admin/ImageUpload';
import Toggle from '@/components/ui/Toggle';
import GlassCard from '@/components/shared/GlassCard';
import PdfPreviewModal from '@/components/shared/PdfPreviewModal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/States';
import type { ApiError, ItemResponse, ProfileDoc, Social } from '@/types';

type ProfileForm = ProfileDoc;
type FlatArrayKey = 'stats' | 'languages';

export default function ProfileManager() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () =>
      (await api.get<ItemResponse<ProfileDoc>>('/profile')).data,
  });
  const [f, setF] = useState<ProfileForm | null>(null);
  const [rolesText, setRolesText] = useState('');
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeViewerOpen, setResumeViewerOpen] = useState(false);
  const [arrKeys, setArrKeys] = useState<Record<FlatArrayKey, string[]>>({
    stats: [],
    languages: [],
  });
  const [socialKeys, setSocialKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!data?.data) return;
    setF(data.data);
    setRolesText((data.data.roles ?? []).join('\n'));
    setArrKeys({
      stats: (data.data.stats ?? []).map(() => crypto.randomUUID()),
      languages: (data.data.languages ?? []).map(() => crypto.randomUUID()),
    });
    setSocialKeys((data.data.socials ?? []).map(() => crypto.randomUUID()));
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

  /** Stats / languages — flat `{ label, value }` / `{ name, level }` rows. */
  const setArr = (
    key: FlatArrayKey,
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

  const addArr = (key: FlatArrayKey, obj: Record<string, string>): void => {
    setF((p) => (p ? { ...p, [key]: [...(p[key] as unknown[]), obj] } : p));
    setArrKeys((k) => ({ ...k, [key]: [...k[key], crypto.randomUUID()] }));
  };

  const delArr = (key: FlatArrayKey, idx: number): void => {
    setF((p) =>
      p ? { ...p, [key]: (p[key] as unknown[]).filter((_, i) => i !== idx) } : p
    );
    setArrKeys((k) => ({
      ...k,
      [key]: k[key].filter((_, i) => i !== idx),
    }));
  };

  /** Socials get their own setters — they carry image-upload fields too, so the generic `Record<string,string>` setArr doesn't fit cleanly. */
  const setSocial = <K extends keyof Social>(
    idx: number,
    field: K,
    val: Social[K]
  ): void =>
    setF((p) => {
      if (!p) return p;
      const arr = [...p.socials];
      const current = arr[idx];
      if (!current) return p;
      arr[idx] = { ...current, [field]: val };
      return { ...p, socials: arr };
    });

  const addSocial = (): void => {
    setF((p) =>
      p
        ? {
            ...p,
            socials: [
              ...p.socials,
              {
                label: '',
                url: '',
                icon: '',
                iconImage: '',
                iconImagePublicId: '',
              },
            ],
          }
        : p
    );
    setSocialKeys((k) => [...k, crypto.randomUUID()]);
  };

  const delSocial = (idx: number): void => {
    setF((p) =>
      p ? { ...p, socials: p.socials.filter((_, i) => i !== idx) } : p
    );
    setSocialKeys((k) => k.filter((_, i) => i !== idx));
  };

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
    save.mutate({
      ...f,
      roles: rolesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    });
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
      <PageHeader title="Profile" />

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="space-y-4 p-4">
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
              value={rolesText}
              onChange={(e) => setRolesText(e.target.value)}
            />
          </div>

          {/* Stats (Hero Terminal) — inline within Basics, immediately under
              Hero roles. Custom layout (not the shared ArrayEditor) so it
              renders as a flat sub-section instead of a nested GlassCard. */}
          <div className="border-t border-border/60 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="label mb-0">Stats (Hero Terminal)</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addArr('stats', { label: '', value: '' })}
                className="text-xs"
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {(f.stats ?? []).map((s, i) => (
                <div
                  key={arrKeys.stats[i] ?? i}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center"
                >
                  <input
                    className="input flex-1"
                    placeholder="Label (e.g. Problems Solved)"
                    value={s.label}
                    onChange={(e) =>
                      setArr('stats', i, 'label', e.target.value)
                    }
                  />
                  <input
                    className="input flex-1"
                    placeholder="Value (e.g. 1000+)"
                    value={s.value}
                    onChange={(e) =>
                      setArr('stats', i, 'value', e.target.value)
                    }
                  />
                  <button
                    type="button"
                    onClick={() => delArr('stats', i)}
                    aria-label="Remove stat"
                    className="shrink-0 self-end rounded-lg border border-border p-2.5 text-muted-foreground/70 transition-colors hover:border-destructive/40 hover:text-destructive sm:self-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {(f.stats ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground/70">None yet.</p>
              )}
            </div>
          </div>

          {/* Languages — inline within Basics, immediately under Stats. */}
          <div className="border-t border-border/60 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="label mb-0">Languages</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addArr('languages', { name: '', level: '' })}
                className="text-xs"
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {(f.languages ?? []).map((l, i) => (
                <div
                  key={arrKeys.languages[i] ?? i}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center"
                >
                  <input
                    className="input flex-1"
                    placeholder="Language (e.g. English)"
                    value={l.name}
                    onChange={(e) =>
                      setArr('languages', i, 'name', e.target.value)
                    }
                  />
                  <input
                    className="input flex-1"
                    placeholder="Level (e.g. Fluent, Native)"
                    value={l.level}
                    onChange={(e) =>
                      setArr('languages', i, 'level', e.target.value)
                    }
                  />
                  <button
                    type="button"
                    onClick={() => delArr('languages', i)}
                    aria-label="Remove language"
                    className="shrink-0 self-end rounded-lg border border-border p-2.5 text-muted-foreground/70 transition-colors hover:border-destructive/40 hover:text-destructive sm:self-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {(f.languages ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground/70">None yet.</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-border/60 pt-4">
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
            <h3 className="font-semibold text-neon">Avatar &amp; Resume</h3>
            <ImageUpload
              label="Avatar"
              value={f.avatar}
              publicId={f.avatarPublicId}
              folder="portfolio/profile"
              variant="avatar"
              onChange={({ url, publicId }) => {
                set('avatar', url);
                set('avatarPublicId', publicId);
              }}
            />
            <div className="space-y-2">
              <label className="label">Resume (PDF)</label>
              {/* When a resume exists: two clear action buttons.
                  – View opens a modal with an in-browser PDF viewer.
                  – Download forces a file download via Cloudinary's
                    `fl_attachment` flag (URL transform, no extra API).
                  When empty: only the Upload button below shows. */}
              {f.resumeUrl && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setResumeViewerOpen(true)}
                  >
                    <Eye className="h-4 w-4" /> View Resume
                  </Button>
                  <a
                    href={proxyFileUrl(f.resumeUrl, 'resume.pdf', false)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-muted/60 hover:text-primary"
                  >
                    <Download className="h-4 w-4" /> Download Resume
                  </a>
                </div>
              )}
              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-muted/60 hover:text-primary">
                {resumeBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileUp className="h-4 w-4" />
                )}
                {f.resumeUrl ? 'Replace resume PDF' : 'Upload resume PDF'}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => uploadResume(e.target.files?.[0])}
                />
              </label>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-neon">Social links</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addSocial}
                className="text-xs"
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            <p className="mb-4 text-2xs text-muted-foreground/70">
              Icon is auto-picked from the Label (e.g. GitHub, LinkedIn, Email).
              Upload an image only if you want to override it.
            </p>
            <div className="space-y-4">
              {f.socials.map((s, i) => (
                <div
                  key={socialKeys[i] ?? i}
                  className="rounded-xl border border-border bg-muted/30 p-4"
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="label">Label</label>
                      <input
                        className="input"
                        placeholder="GitHub / LinkedIn / Email…"
                        value={s.label}
                        onChange={(e) => setSocial(i, 'label', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">URL</label>
                      <input
                        className="input"
                        placeholder="https://…"
                        value={s.url}
                        onChange={(e) => setSocial(i, 'url', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <ImageUpload
                      label="Icon image (override)"
                      value={s.iconImage}
                      publicId={s.iconImagePublicId}
                      folder="portfolio/profile"
                      variant="compact"
                      onChange={({ url, publicId }) => {
                        setSocial(i, 'iconImage', url);
                        setSocial(i, 'iconImagePublicId', publicId);
                      }}
                    />
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => delSocial(i)}
                      aria-label="Remove social link"
                      className="rounded-lg border border-border p-2 text-muted-foreground/70 transition-colors hover:border-destructive/40 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {f.socials.length === 0 && (
                <p className="text-xs text-muted-foreground/70">None yet.</p>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Resume preview — react-pdf-backed viewer in an animated overlay.
          Lazy-loaded, so the ~600 KB pdfjs worker only ships when an admin
          actually clicks "View Resume". Replaces the prior native iframe
          which lacked zoom, pagination, fullscreen, and pinch-to-zoom. */}
      <PdfPreviewModal
        target={
          resumeViewerOpen && f.resumeUrl
            ? { fileUrl: f.resumeUrl, title: 'Resume' }
            : null
        }
        onClose={() => setResumeViewerOpen(false)}
      />

      {/* Sticky-bottom Save bar — replaces the previous PageHeader-action
          button so the save affordance is always within thumb-reach as the
          admin scrolls through the long Profile form. */}
      <div className="sticky bottom-4 z-10 mt-4 flex justify-end">
        <Button type="submit" disabled={save.isPending} size="lg">
          {save.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save changes
        </Button>
      </div>
    </form>
  );
}
