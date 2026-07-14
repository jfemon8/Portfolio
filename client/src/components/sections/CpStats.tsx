import {
  Trophy,
  ExternalLink,
  TrendingUp,
  Award,
  Code2,
  LineChart,
  Medal,
  Star,
} from 'lucide-react';
import { Section, SectionHeading } from '@/components/shared/Section';
import { useSectionCopy } from '@/hooks/useSectionCopy';
import { useSiteCopy } from '@/hooks/useSiteCopy';
import GlassCard from '@/components/shared/GlassCard';
import SparkArea from '@/components/shared/SparkArea';
import Heatmap from '@/components/shared/Heatmap';
import Terminal from '@/components/shared/Terminal';
import Counter from '@/components/shared/Counter';
import Reveal from '@/components/motion/Reveal';
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
  const copy = useSectionCopy('cp', {
    index: '~/cp',
    title: 'Competitive programming',
    subtitle:
      'Live Codeforces & LeetCode standing — problem-solving under time pressure.',
  });
  const lab = useSiteCopy('labels', {
    cpCurrentRating: 'Current rating',
    cpMaxRating: 'Max rating',
    cpContests: 'Contests',
    cpUnrated: 'Unrated',
    cpCfProfile: 'Codeforces profile',
    cpRatingHistory: 'Rating history',
    cpLeetcode: 'LeetCode',
    cpLcProfile: 'Profile',
    cpSolved: 'Solved',
    cpEasy: 'Easy',
    cpMedium: 'Medium',
    cpHard: 'Hard',
    cpSubmissionActivity: 'Submission activity',
    cpCodechef: 'CodeChef',
    cpHighest: 'Highest',
    cpCcProfile: 'CodeChef profile',
  });
  if (isLoading || isError || !cp) return null;

  const cards = [
    {
      label: lab.cpCurrentRating,
      value: cp.rating != null ? String(cp.rating) : '—',
      icon: TrendingUp,
    },
    {
      label: lab.cpMaxRating,
      value: cp.maxRating != null ? String(cp.maxRating) : '—',
      icon: Award,
    },
    { label: lab.cpContests, value: String(cp.contests), icon: Trophy },
  ];

  const lc = cp.leetcode;
  const badges = [
    cp.rank ? `CF ${cp.rank}` : '',
    cp.maxRating != null ? `Peak ${cp.maxRating}` : '',
    cp.contests >= 100
      ? '100+ contests'
      : cp.contests >= 50
        ? '50+ contests'
        : cp.contests >= 10
          ? '10+ contests'
          : '',
    lc && lc.totalSolved >= 1000
      ? '1000+ solved'
      : lc && lc.totalSolved >= 500
        ? '500+ solved'
        : lc && lc.totalSolved >= 100
          ? '100+ solved'
          : '',
  ].filter(Boolean);

  const term = [
    '$ whoami',
    `${cp.handle} — competitive programmer`,
    '$ codeforces --rating',
    `${cp.rating ?? '—'} (max ${cp.maxRating ?? '—'})${
      cp.rank ? ` · ${cp.rank}` : ''
    }`,
    ...(lc
      ? [
          '$ leetcode --solved',
          `${lc.totalSolved} solved · ${lc.easy}E / ${lc.medium}M / ${lc.hard}H`,
        ]
      : []),
    '$ echo $CONTESTS',
    `${cp.contests} rated contests`,
  ];

  return (
    <Section id="competitive">
      <SectionHeading
        index={copy.index}
        title={copy.title}
        subtitle={copy.subtitle}
      />

      <Reveal>
        <Terminal lines={term} className="mb-8" />
      </Reveal>

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

      {badges.length > 0 && (
        <Reveal delay={0.14}>
          <div className="mt-5 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-neon"
              >
                <Medal className="h-3.5 w-3.5" /> {b}
              </span>
            ))}
          </div>
        </Reveal>
      )}

      <Reveal delay={0.2}>
        <GlassCard className="mt-5 flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-neon">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-foreground">@{cp.handle}</p>
              <p className="text-xs capitalize text-muted-foreground/70">
                {cp.rank || lab.cpUnrated}
                {cp.maxRank ? ` · max ${cp.maxRank}` : ''}
              </p>
            </div>
          </div>
          <a
            href={`https://codeforces.com/profile/${cp.handle}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-card/50 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <ExternalLink className="h-4 w-4" /> {lab.cpCfProfile}
          </a>
        </GlassCard>
      </Reveal>

      {cp.ratingHistory.length > 1 && (
        <Reveal delay={0.24}>
          <GlassCard className="mt-5 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                <LineChart className="h-5 w-5 text-neon" />{' '}
                {lab.cpRatingHistory}
              </h3>
              <span className="text-xs text-muted-foreground/70">
                {cp.ratingHistory.length} contests · peak{' '}
                {Math.max(...cp.ratingHistory.map((p) => p.rating))}
              </span>
            </div>
            <div className="h-40 w-full">
              <SparkArea
                data={cp.ratingHistory.map((p) => p.rating)}
                ariaLabel={`Codeforces rating across ${cp.ratingHistory.length} contests`}
              />
            </div>
          </GlassCard>
        </Reveal>
      )}

      {cp.leetcode && (
        <Reveal delay={0.28}>
          <GlassCard className="mt-5 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                <Code2 className="h-5 w-5 text-neon" /> {lab.cpLeetcode}
                {cp.leetcode.ranking != null && (
                  <span className="text-xs font-normal text-muted-foreground/70">
                    · global #{cp.leetcode.ranking.toLocaleString()}
                  </span>
                )}
              </h3>
              <a
                href={`https://leetcode.com/u/${cp.leetcode.handle}/`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-card/50 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                <ExternalLink className="h-4 w-4" /> {lab.cpLcProfile}
              </a>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: lab.cpSolved, value: cp.leetcode.totalSolved },
                { label: lab.cpEasy, value: cp.leetcode.easy },
                { label: lab.cpMedium, value: cp.leetcode.medium },
                { label: lab.cpHard, value: cp.leetcode.hard },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-border/60 bg-card/50 p-4 text-center"
                >
                  <Counter
                    value={String(s.value)}
                    className="block text-2xl font-extrabold text-neon"
                  />
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground/70">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
            {cp.leetcode.calendar && cp.leetcode.calendar.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground/70">
                  {lab.cpSubmissionActivity}
                </p>
                <Heatmap
                  data={cp.leetcode.calendar}
                  ariaLabel={`LeetCode submissions for ${cp.leetcode.handle}`}
                />
              </div>
            )}
          </GlassCard>
        </Reveal>
      )}

      {cp.codechef && (
        <Reveal delay={0.32}>
          <GlassCard className="mt-5 flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-neon">
                <Star className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-foreground">
                  {lab.cpCodechef} · {cp.codechef.rating ?? '—'}
                  <span className="ml-2 text-neon">
                    {'★'.repeat(cp.codechef.stars)}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {lab.cpHighest} {cp.codechef.highestRating ?? '—'}
                </p>
              </div>
            </div>
            <a
              href={`https://www.codechef.com/users/${cp.codechef.handle}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-card/50 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              <ExternalLink className="h-4 w-4" /> {lab.cpCcProfile}
            </a>
          </GlassCard>
        </Reveal>
      )}
    </Section>
  );
}
