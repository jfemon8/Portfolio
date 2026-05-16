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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">
          Welcome back,{' '}
          <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Here's what's happening with your portfolio.
        </p>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <Link
                key={s.label}
                to={s.to}
                className={`glass glass-hover p-5 ${
                  s.highlight ? 'border-neon/40' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <s.icon className="h-5 w-5 text-neon" />
                  <ArrowRight className="h-4 w-4 text-ink-dim" />
                </div>
                <p className="mt-3 text-3xl font-bold text-ink">{s.value}</p>
                <p className="text-xs text-ink-dim">{s.label}</p>
              </Link>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="glass p-6">
              <h2 className="mb-4 font-semibold text-ink">Quick actions</h2>
              <div className="grid grid-cols-2 gap-3">
                {quick.map((q) => (
                  <Link
                    key={q.label}
                    to={q.to}
                    className="flex items-center gap-3 rounded-xl border border-line bg-bg-soft px-4 py-3 text-sm text-ink-soft transition-colors hover:border-neon/40 hover:text-neon"
                  >
                    <q.icon className="h-4 w-4" />
                    {q.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="glass p-6">
              <h2 className="mb-4 font-semibold text-ink">Top content</h2>
              <div className="space-y-2 text-sm">
                {(a?.topProjects ?? []).slice(0, 4).map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center justify-between border-b border-line/60 pb-2 last:border-0"
                  >
                    <span className="truncate text-ink-soft">{p.title}</span>
                    <span className="flex items-center gap-1.5 text-xs text-ink-dim">
                      <Eye className="h-3.5 w-3.5" /> {p.views}
                    </span>
                  </div>
                ))}
                {!a?.topProjects?.length && (
                  <p className="text-xs text-ink-dim">No data yet.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
