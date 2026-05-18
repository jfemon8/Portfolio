import { Trophy, ExternalLink, TrendingUp, Award } from 'lucide-react';
import { Section, SectionHeading } from '@/components/shared/Section';
import GlassCard from '@/components/shared/GlassCard';
import Counter from '@/components/shared/Counter';
import Reveal from '@/components/motion/Reveal';
import Magnetic from '@/components/motion/Magnetic';
import { useCpStats } from '@/hooks/usePortfolio';

/**
 * Live competitive-programming standing (Codeforces). Fully optional &
 * self-hiding: renders nothing until the API returns data (no handle set,
 * loading or error → the public page is unchanged). Reuses the shared
 * Section / GlassCard / Counter / Reveal primitives (project rule #3).
 */
export default function CpStats() {
  const { data, isLoading, isError } = useCpStats();
  const cp = data?.data;
  if (isLoading || isError || !cp) return null;

  const cards = [
    {
      label: 'Current rating',
      value: cp.rating != null ? String(cp.rating) : '—',
      icon: TrendingUp,
    },
    {
      label: 'Max rating',
      value: cp.maxRating != null ? String(cp.maxRating) : '—',
      icon: Award,
    },
    { label: 'Contests', value: String(cp.contests), icon: Trophy },
  ];

  return (
    <Section id="competitive">
      <SectionHeading
        index="~/cp"
        title="Competitive programming"
        subtitle="Live Codeforces standing — problem-solving under time pressure."
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <Reveal key={c.label} delay={i * 0.06}>
            <GlassCard className="p-6">
              <c.icon className="mb-3 h-5 w-5 text-neon" />
              <Counter
                value={c.value}
                className="block text-3xl font-extrabold text-foreground"
              />
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground/70">
                {c.label}
              </p>
            </GlassCard>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.2}>
        <GlassCard className="mt-5 flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-neon">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-foreground">@{cp.handle}</p>
              <p className="text-xs capitalize text-muted-foreground/70">
                {cp.rank || 'Unrated'}
                {cp.maxRank ? ` · max ${cp.maxRank}` : ''}
              </p>
            </div>
          </div>
          <Magnetic strength={0.4}>
            <a
              href={`https://codeforces.com/profile/${cp.handle}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-card/50 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              <ExternalLink className="h-4 w-4" /> Codeforces profile
            </a>
          </Magnetic>
        </GlassCard>
      </Reveal>
    </Section>
  );
}
