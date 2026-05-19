import { Briefcase, MapPin } from 'lucide-react';
import { Section, SectionHeading } from '@/components/shared/Section';
import { useSectionCopy } from '@/hooks/useSectionCopy';
import Reveal from '@/components/motion/Reveal';
import GlassCard from '@/components/shared/GlassCard';
import { Spinner, ErrorState } from '@/components/ui/States';
import { useExperience } from '@/hooks/usePortfolio';

/**
 * Cinematic vertical experience timeline — gradient rail, glowing nodes,
 * glass cards with staggered reveals.
 */
export default function Experience() {
  const { data, isLoading, isError, refetch } = useExperience();
  const items = data?.data ?? [];
  const copy = useSectionCopy('experience', {
    index: '04.',
    title: 'Experience',
    subtitle: "Where I've worked and what I shipped.",
  });

  return (
    <Section id="experience">
      <SectionHeading
        index={copy.index}
        title={copy.title}
        subtitle={copy.subtitle}
      />

      {isLoading && <Spinner />}
      {isError && <ErrorState onRetry={() => void refetch()} />}

      <div className="relative ml-3 pl-8 sm:ml-4">
        {/* gradient rail */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-neon/60 via-neon-violet/40 to-transparent"
        />
        {items.map((e, i) => (
          <Reveal
            key={e._id}
            delay={i * 0.06}
            className="relative pb-10 last:pb-0"
          >
            <span className="absolute -left-[41px] grid h-7 w-7 place-items-center rounded-full border border-primary/40 bg-background text-neon shadow-glow">
              <Briefcase className="h-3.5 w-3.5" />
            </span>
            <GlassCard interactive className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {e.role}
                  </h3>
                  <p className="font-medium text-neon">{e.company}</p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${
                    e.current
                      ? 'border-primary/40 text-neon'
                      : 'border-border/70 text-muted-foreground'
                  }`}
                >
                  {e.startDate} — {e.endDate}
                </span>
              </div>
              {e.location && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <MapPin className="h-3.5 w-3.5" /> {e.location}
                </p>
              )}
              <ul className="mt-4 space-y-2">
                {e.highlights.map((h, hi) => (
                  <li
                    key={hi}
                    className="flex gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-1 text-neon">▹</span>
                    {h}
                  </li>
                ))}
              </ul>
              {e.tech.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {e.tech.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-border/60 bg-card/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </GlassCard>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
