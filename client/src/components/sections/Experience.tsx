import { Section, SectionHeading } from '@/components/ui/Section';
import Reveal from '@/components/ui/Reveal';
import { Spinner, ErrorState } from '@/components/ui/States';
import { useExperience } from '@/hooks/usePortfolio';
import { Briefcase, MapPin } from 'lucide-react';

export default function Experience() {
  const { data, isLoading, isError, refetch } = useExperience();
  const items = data?.data ?? [];

  return (
    <Section id="experience" className="bg-bg-soft/40">
      <SectionHeading
        index="04."
        title="Experience"
        subtitle="Where I've worked and what I've done."
      />
      {isLoading && <Spinner />}
      {isError && <ErrorState onRetry={refetch} />}

      <div className="relative ml-3 border-l border-line pl-8 sm:ml-4">
        {items.map((e, i) => (
          <Reveal key={e._id} delay={i * 0.05}>
            <div className="relative pb-10 last:pb-0">
              <span className="absolute -left-[41px] grid h-7 w-7 place-items-center rounded-full border border-neon/40 bg-bg text-neon">
                <Briefcase className="h-3.5 w-3.5" />
              </span>
              <div className="glass p-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-ink">{e.role}</h3>
                    <p className="text-neon">{e.company}</p>
                  </div>
                  <span
                    className={`chip ${
                      e.current ? 'border-neon/40 text-neon' : ''
                    }`}
                  >
                    {e.startDate} — {e.endDate}
                  </span>
                </div>
                {e.location && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-dim">
                    <MapPin className="h-3.5 w-3.5" /> {e.location}
                  </p>
                )}
                <ul className="mt-4 space-y-2">
                  {e.highlights.map((h, hi) => (
                    <li
                      key={hi}
                      className="flex gap-2 text-sm text-ink-soft"
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
                        className="rounded-md bg-bg-elevated px-2 py-0.5 font-mono text-[11px] text-ink-soft"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
