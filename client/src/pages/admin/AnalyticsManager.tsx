import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import {
  Eye,
  MousePointerClick,
  FileDown,
  Mail,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import PageHeader from '@/components/admin/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import { Spinner } from '@/components/ui/States';
import type { AnalyticsSummary, ItemResponse, VisitType } from '@/types';

const COLORS = ['#00ffd1', '#a855f7', '#38bdf8', '#ec4899', '#0bbfa3'];

const axisStroke = 'hsl(var(--muted-foreground))';
const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 12,
  color: 'hsl(var(--foreground))',
} as const;

const typeIcon: Record<string, LucideIcon> = {
  pageview: Eye,
  project_click: MousePointerClick,
  resume_download: FileDown,
  contact_submit: Mail,
};

export default function AnalyticsManager() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', days],
    queryFn: async () =>
      (
        await api.get<ItemResponse<AnalyticsSummary>>(
          `/analytics/summary?days=${days}`
        )
      ).data,
  });

  if (isLoading) return <Spinner />;
  const a = data?.data;
  if (!a) return null;

  const cards = [
    { label: 'Page views (total)', value: a.pageviews.total, icon: Eye },
    { label: `Views (${days}d)`, value: a.pageviews.range, icon: Eye },
    {
      label: 'Projects',
      value: a.counts.projects,
      icon: MousePointerClick,
    },
    { label: 'Unread messages', value: a.counts.unread, icon: Mail },
  ];

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Privacy-friendly, cookie-less visitor insights."
        action={
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="input w-auto"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <GlassCard key={c.label} className="p-5">
            <c.icon className="mb-3 h-5 w-5 text-neon" />
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <h3 className="mb-4 font-semibold text-foreground">
            Page views over time
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={a.byDay}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ffd1" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#00ffd1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke={axisStroke} fontSize={11} />
              <YAxis stroke={axisStroke} fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#00ffd1"
                strokeWidth={2}
                fill="url(#g)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="mb-4 font-semibold text-foreground">By device</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={a.byDevice}
                dataKey="count"
                nameKey="_id"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
              >
                {a.byDevice.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
            {a.byDevice.map((d, i) => (
              <span
                key={d._id}
                className="flex items-center gap-1.5 text-muted-foreground"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                {d._id} ({d.count})
              </span>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="mb-4 font-semibold text-foreground">Events</h3>
          <div className="space-y-3">
            {a.byType.map((t) => {
              const Icon = typeIcon[t._id as VisitType] ?? Eye;
              return (
                <div
                  key={t._id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="h-4 w-4 text-neon" />
                    {t._id.replace('_', ' ')}
                  </span>
                  <span className="font-mono text-foreground">{t.count}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="p-6 lg:col-span-2">
          <h3 className="mb-4 font-semibold text-foreground">Top projects</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={a.topProjects} layout="vertical">
              <XAxis type="number" stroke={axisStroke} fontSize={11} />
              <YAxis
                type="category"
                dataKey="title"
                stroke={axisStroke}
                fontSize={11}
                width={110}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: 'hsl(var(--muted))' }}
              />
              <Bar dataKey="views" fill="#a855f7" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
    </div>
  );
}
