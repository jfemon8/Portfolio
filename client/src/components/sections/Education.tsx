import { Section, SectionHeading } from '@/components/ui/Section';
import Reveal from '@/components/ui/Reveal';
import { Spinner } from '@/components/ui/States';
import { useEducation } from '@/hooks/usePortfolio';
import { GraduationCap, MapPin } from 'lucide-react';

export default function Education() {
  const { data, isLoading } = useEducation();
  const items = data?.data ?? [];

  return (
    <Section id="education">
      <SectionHeading index="05." title="Education" />
      {isLoading && <Spinner />}
      <div className="grid gap-5 md:grid-cols-3">
        {items.map((e, i) => (
          <Reveal key={e._id} delay={i * 0.06}>
            <div className="glass glass-hover h-full p-6">
              <GraduationCap className="mb-4 h-7 w-7 text-neon" />
              <h3 className="font-bold text-ink">{e.institution}</h3>
              <p className="mt-1 text-sm text-neon">
                {e.degree}
                {e.field ? ` — ${e.field}` : ''}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs text-ink-dim">
                <span>
                  {e.startYear} – {e.endYear}
                </span>
                {e.grade && <span className="chip">{e.grade}</span>}
              </div>
              {e.location && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-dim">
                  <MapPin className="h-3.5 w-3.5" /> {e.location}
                </p>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
