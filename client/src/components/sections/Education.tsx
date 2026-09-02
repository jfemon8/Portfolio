import { GraduationCap, MapPin } from 'lucide-react';
import { Section, SectionHeading } from '@/components/shared/Section';
import { useSectionCopy } from '@/hooks/useSectionCopy';
import Reveal from '@/components/motion/Reveal';
import GlassCard from '@/components/shared/GlassCard';
import Async from '@/components/ui/Async';
import { EducationCardSkeleton } from '@/components/ui/Skeletons';
import { useEducation } from '@/hooks/usePortfolio';

export default function Education() {
  const educationQuery = useEducation();
  const copy = useSectionCopy('education', {
    index: '05.',
    title: 'Education',
    subtitle: '',
  });

  return (
    <Section id="education">
      <SectionHeading
        index={copy.index}
        title={copy.title}
        subtitle={copy.subtitle}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Async
          query={educationQuery}
          select={(r) => r.data}
          hint="education"
          fallbackCount={3}
          skeleton={(n) => <EducationCardSkeleton count={n} />}
          stateClass="col-span-full"
        >
          {(items) =>
            items.map((e, i) => (
              <Reveal key={e._id} delay={i * 0.07}>
                <div className="group relative h-full w-0 min-w-full rounded-2xl">
                  <GlassCard interactive className="h-full p-4">
                    <GraduationCap
                      className="mb-4 h-7 w-7 text-neon"
                      strokeWidth={2.25}
                    />
                    <h3 className="font-bold text-foreground">
                      {e.institution}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-neon">
                      {e.degree}
                      {e.field ? ` — ${e.field}` : ''}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground/70">
                      <span>
                        {e.startYear} – {e.endYear}
                      </span>
                      {e.grade && (
                        <span className="rounded-full border border-border/70 bg-card/60 px-2 py-1 text-muted-foreground">
                          {e.grade}
                        </span>
                      )}
                    </div>
                    {e.location && (
                      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground/70">
                        <MapPin className="h-3.5 w-3.5" /> {e.location}
                      </p>
                    )}
                    {e.description && (
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground/70 line-clamp-3">
                        {e.description}
                      </p>
                    )}
                  </GlassCard>
                </div>
              </Reveal>
            ))
          }
        </Async>
      </div>
    </Section>
  );
}
