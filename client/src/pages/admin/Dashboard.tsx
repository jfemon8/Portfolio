import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FolderGit2,
  Newspaper,
  Inbox,
  Eye,
  ArrowRight,
  Plus,
  User,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import GlassCard from '@/components/shared/GlassCard';
import Counter from '@/components/shared/Counter';
import Reveal from '@/components/motion/Reveal';
import { Spinner } from '@/components/ui/States';
import type { AnalyticsSummary, ItemResponse } from '@/types';

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 30],
    queryFn: async () =>
      (
        await api.get<ItemResponse<AnalyticsSummary>>(
          '/analytics/summary?days=30'
        )
      ).data,
  });

  const a = data?.data;

  const stats: {
    label: string;
    value: number | string;
    icon: LucideIcon;
    to: string;
    highlight?: boolean;
  }[] = [
    {
      label: 'Page views (30d)',
      value: a?.pageviews.range ?? '—',
      icon: Eye,
      to: '/admin/analytics',
    },
    {
      label: 'Projects',
      value: a?.counts.projects ?? '—',
      icon: FolderGit2,
      to: '/admin/projects',
    },
    {
      label: 'Published posts',
      value: a?.counts.posts ?? '—',
      icon: Newspaper,
      to: '/admin/blog',
    },
    {
      label: 'Unread messages',
      value: a?.counts.unread ?? '—',
      icon: Inbox,
      to: '/admin/messages',
      highlight: (a?.counts.unread ?? 0) > 0,
    },
  ];

  const quick: { label: string; to: string; icon: LucideIcon }[] = [
    { label: 'New blog post', to: '/admin/blog/new', icon: Plus },
    { label: 'Add project', to: '/admin/projects', icon: FolderGit2 },
    { label: 'Edit profile', to: '/admin/profile', icon: User },
    { label: 'Add experience', to: '/admin/experience', icon: Briefcase },
  ];

  return (
    <div>
      <Reveal>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back,{' '}
            <span className="gradient-text">{user?.name?.split(' ')[0]}</span>{' '}
            👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's happening with your portfolio.
          </p>
        </div>
      </Reveal>

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.05}>
                <Link to={s.to}>
                  <GlassCard
                    interactive
                    className={`p-5 ${s.highlight ? 'border-primary/40' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <s.icon className="h-5 w-5 text-neon" />
                      <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-foreground">
                      <Counter value={String(s.value)} />
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      {s.label}
                    </p>
                  </GlassCard>
                </Link>
              </Reveal>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Reveal delay={0.1}>
              <GlassCard className="p-6">
                <h2 className="mb-4 font-semibold text-foreground">
                  Quick actions
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {quick.map((q) => (
                    <Link
                      key={q.label}
                      to={q.to}
                      className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/50 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      <q.icon className="h-4 w-4" />
                      {q.label}
                    </Link>
                  ))}
                </div>
              </GlassCard>
            </Reveal>

            <Reveal delay={0.15}>
              <GlassCard className="p-6">
                <h2 className="mb-4 font-semibold text-foreground">
                  Top content
                </h2>
                <div className="space-y-2 text-sm">
                  {(a?.topProjects ?? []).slice(0, 4).map((p) => (
                    <div
                      key={p._id}
                      className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0"
                    >
                      <span className="truncate text-muted-foreground">
                        {p.title}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                        <Eye className="h-3.5 w-3.5" /> {p.views}
                      </span>
                    </div>
                  ))}
                  {!a?.topProjects?.length && (
                    <p className="text-xs text-muted-foreground/70">
                      No data yet.
                    </p>
                  )}
                </div>
              </GlassCard>
            </Reveal>
          </div>
        </>
      )}
    </div>
  );
}
