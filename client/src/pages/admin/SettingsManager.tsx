import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import {
  KeyRound,
  User,
  Loader2,
  Globe,
  LayoutList,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useSeoSettings, useSiteSettings } from '@/hooks/usePortfolio';
import { HOME_SECTIONS } from '@/config/homeSections';
import PageHeader from '@/components/admin/PageHeader';
import ImageUpload from '@/components/admin/ImageUpload';
import Toggle from '@/components/ui/Toggle';
import GlassCard from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import type { ApiError, MeResponse, SeoSettings, SiteSettings } from '@/types';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirm: string;
}

export default function SettingsManager() {
  const { user, setUser } = useAuth();
  const [savingName, setSavingName] = useState(false);
  const [name, setName] = useState(user?.name || '');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>();

  const qc = useQueryClient();
  const { data: seoRes } = useSeoSettings();
  const [seo, setSeo] = useState<SeoSettings | null>(null);
  const [savingSeo, setSavingSeo] = useState(false);

  useEffect(() => {
    if (seoRes?.data) setSeo(seoRes.data);
  }, [seoRes]);

  const saveSeo = async (): Promise<void> => {
    if (!seo) return;
    setSavingSeo(true);
    try {
      await api.put('/seo', {
        siteName: seo.siteName,
        authorName: seo.authorName,
        siteUrl: seo.siteUrl,
        metaTitle: seo.metaTitle,
        metaDescription: seo.metaDescription,
        keywords: seo.keywords,
        ogImage: seo.ogImage,
        ogImagePublicId: seo.ogImagePublicId,
        twitterHandle: seo.twitterHandle,
      });
      qc.invalidateQueries({ queryKey: ['seo'] });
      toast.success('SEO settings saved');
    } catch (err) {
      toast.error((err as ApiError).message || 'Failed to save SEO');
    } finally {
      setSavingSeo(false);
    }
  };

  const { data: siteRes } = useSiteSettings();
  const [site, setSite] = useState<SiteSettings | null>(null);
  const [savingSite, setSavingSite] = useState(false);

  useEffect(() => {
    if (!siteRes?.data) return;
    const saved = siteRes.data.sections ?? [];
    const savedKeys = new Set(saved.map((s) => s.key));
    const sections =
      saved.length > 0
        ? [
            ...saved.filter((s) => HOME_SECTIONS.some((h) => h.key === s.key)),
            ...HOME_SECTIONS.filter((h) => !savedKeys.has(h.key)).map((h) => ({
              key: h.key,
              visible: true,
            })),
          ]
        : HOME_SECTIONS.map((h) => ({ key: h.key, visible: true }));
    setSite({ heroBackground: siteRes.data.heroBackground, sections });
  }, [siteRes]);

  const moveSection = (i: number, dir: -1 | 1): void => {
    if (!site) return;
    const j = i + dir;
    const next = [...site.sections];
    const a = next[i];
    const b = next[j];
    if (!a || !b) return;
    next[i] = b;
    next[j] = a;
    setSite({ ...site, sections: next });
  };

  const toggleSection = (i: number): void => {
    if (!site) return;
    setSite({
      ...site,
      sections: site.sections.map((s, idx) =>
        idx === i ? { ...s, visible: !s.visible } : s
      ),
    });
  };

  const saveSite = async (): Promise<void> => {
    if (!site) return;
    setSavingSite(true);
    try {
      await api.put('/site', {
        heroBackground: site.heroBackground,
        sections: site.sections,
      });
      qc.invalidateQueries({ queryKey: ['site'] });
      toast.success('Homepage settings saved');
    } catch (err) {
      toast.error((err as ApiError).message || 'Failed to save homepage');
    } finally {
      setSavingSite(false);
    }
  };

  const labelOf = (key: string): string =>
    HOME_SECTIONS.find((h) => h.key === key)?.label ?? key;

  const changePassword = async (v: PasswordForm): Promise<void> => {
    if (v.newPassword !== v.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    try {
      await api.patch('/auth/password', {
        currentPassword: v.currentPassword,
        newPassword: v.newPassword,
      });
      toast.success('Password updated');
      reset();
    } catch (err) {
      toast.error((err as ApiError).message || 'Failed to update password');
    }
  };

  const saveName = async (): Promise<void> => {
    setSavingName(true);
    try {
      const { data } = await api.patch<MeResponse>('/auth/profile', { name });
      setUser(data.user);
      toast.success('Account updated');
    } catch (err) {
      toast.error((err as ApiError).message || 'Failed');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your admin account." />

      <div className="grid max-w-3xl gap-6">
        <GlassCard className="p-6">
          <h3 className="mb-5 flex items-center gap-2 font-semibold text-neon">
            <User className="h-4 w-4" /> Account
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Display name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input opacity-60"
                value={user?.email || ''}
                disabled
              />
            </div>
          </div>
          <Button onClick={saveName} disabled={savingName} className="mt-4">
            {savingName && <Loader2 className="h-4 w-4 animate-spin" />}
            Save account
          </Button>
        </GlassCard>

        <GlassCard className="p-6">
          <form onSubmit={handleSubmit(changePassword)}>
            <h3 className="mb-5 flex items-center gap-2 font-semibold text-neon">
              <KeyRound className="h-4 w-4" /> Change password
            </h3>
            <div className="grid gap-4">
              <div>
                <label className="label">Current password</label>
                <input
                  type="password"
                  className="input"
                  {...register('currentPassword', { required: 'Required' })}
                />
                {errors.currentPassword && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.currentPassword.message}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">New password</label>
                  <input
                    type="password"
                    className="input"
                    {...register('newPassword', {
                      required: 'Required',
                      minLength: { value: 8, message: 'Min 8 characters' },
                    })}
                  />
                  {errors.newPassword && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.newPassword.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="label">Confirm new password</label>
                  <input
                    type="password"
                    className="input"
                    {...register('confirm', { required: 'Required' })}
                  />
                  {errors.confirm && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.confirm.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <Button disabled={isSubmitting} className="mt-5" type="submit">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="mb-5 flex items-center gap-2 font-semibold text-neon">
            <Globe className="h-4 w-4" /> SEO &amp; metadata
          </h3>
          {seo && (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">Site name</label>
                  <input
                    className="input"
                    value={seo.siteName}
                    placeholder="Brand / site name"
                    onChange={(e) =>
                      setSeo({ ...seo, siteName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Author name</label>
                  <input
                    className="input"
                    value={seo.authorName}
                    placeholder="Your name"
                    onChange={(e) =>
                      setSeo({ ...seo, authorName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Site URL</label>
                  <input
                    className="input"
                    value={seo.siteUrl}
                    placeholder="https://example.com"
                    onChange={(e) =>
                      setSeo({ ...seo, siteUrl: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="label">Default meta title</label>
                <input
                  className="input"
                  value={seo.metaTitle}
                  placeholder="Title shown in search results & browser tabs"
                  onChange={(e) =>
                    setSeo({ ...seo, metaTitle: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Default meta description</label>
                <textarea
                  rows={3}
                  className="input resize-y"
                  value={seo.metaDescription}
                  placeholder="~150–160 characters"
                  onChange={(e) =>
                    setSeo({ ...seo, metaDescription: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Keywords (comma separated)</label>
                  <input
                    className="input"
                    value={seo.keywords.join(', ')}
                    placeholder="react, mern, portfolio"
                    onChange={(e) =>
                      setSeo({
                        ...seo,
                        keywords: e.target.value
                          .split(',')
                          .map((k) => k.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="label">Twitter handle</label>
                  <input
                    className="input"
                    value={seo.twitterHandle}
                    placeholder="@username"
                    onChange={(e) =>
                      setSeo({ ...seo, twitterHandle: e.target.value })
                    }
                  />
                </div>
              </div>
              <ImageUpload
                label="Default social (OG) image — 1200×630"
                value={seo.ogImage}
                publicId={seo.ogImagePublicId}
                folder="portfolio/seo"
                onChange={({ url, publicId }) =>
                  setSeo({ ...seo, ogImage: url, ogImagePublicId: publicId })
                }
              />
              <Button
                onClick={saveSeo}
                disabled={savingSeo}
                className="mt-1 w-fit"
              >
                {savingSeo && <Loader2 className="h-4 w-4 animate-spin" />}
                Save SEO
              </Button>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="mb-5 flex items-center gap-2 font-semibold text-neon">
            <LayoutList className="h-4 w-4" /> Homepage &amp; hero
          </h3>
          {site && (
            <div className="space-y-5">
              <div>
                <label className="label">Section order &amp; visibility</label>
                <ul className="space-y-2">
                  {site.sections.map((s, i) => (
                    <li
                      key={s.key}
                      className="flex items-center gap-3 rounded-lg border border-border/70 bg-card/50 px-3 py-2"
                    >
                      <span className="flex flex-col">
                        <button
                          type="button"
                          aria-label="Move up"
                          disabled={i === 0}
                          onClick={() => moveSection(i, -1)}
                          className="text-muted-foreground/70 transition-colors hover:text-neon disabled:opacity-30"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Move down"
                          disabled={i === site.sections.length - 1}
                          onClick={() => moveSection(i, 1)}
                          className="text-muted-foreground/70 transition-colors hover:text-neon disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </span>
                      <span className="flex-1 text-sm text-foreground">
                        {labelOf(s.key)}
                      </span>
                      <Toggle
                        checked={s.visible}
                        onChange={() => toggleSection(i)}
                      />
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-muted-foreground/70">
                  The hero section always shows first.
                </p>
              </div>
              <ImageUpload
                label="Hero background image (optional, subtle)"
                value={site.heroBackground}
                folder="portfolio/hero"
                onChange={({ url }) =>
                  setSite({ ...site, heroBackground: url })
                }
              />
              <Button
                onClick={saveSite}
                disabled={savingSite}
                className="w-fit"
              >
                {savingSite && <Loader2 className="h-4 w-4 animate-spin" />}
                Save homepage
              </Button>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
