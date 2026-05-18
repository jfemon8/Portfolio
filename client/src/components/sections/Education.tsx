import { GraduationCap, MapPin } from 'lucide-react';
import { Section, SectionHeading } from '@/components/shared/Section';
import Reveal from '@/components/motion/Reveal';
import Tilt3D from '@/components/motion/Tilt3D';
import GlassCard from '@/components/shared/GlassCard';
import { Spinner } from '@/components/ui/States';
import { useEducation } from '@/hooks/usePortfolio';

export default function Education() {
  const { data, isLoading } = useEducation();
  const items = data?.data ?? [];

  return (
    <Section id="education">
      <SectionHeading index="05." title="Education" />
      {isLoading && <Spinner />}
      <div className="grid gap-5 md:grid-cols-3">
        {items.map((e, i) => (
          <Reveal key={e._id} delay={i * 0.07}>
            <Tilt3D max={7} className="group relative h-full rounded-2xl">
              <GlassCard interactive className="h-full p-6">
                <GraduationCap className="mb-4 h-7 w-7 text-neon" />
                <h3 className="font-bold text-foreground">{e.institution}</h3>
                <p className="mt-1 text-sm font-medium text-neon">
                  {e.degree}
                  {e.field ? ` — ${e.field}` : ''}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground/70">
                  <span>
                    {e.startYear} – {e.endYear}
                  </span>
                  {e.grade && (
                    <span className="rounded-full border border-border/70 bg-card/60 px-2.5 py-1 text-muted-foreground">
                      {e.grade}
                    </span>
                  )}
                </div>
                {e.location && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground/70">
                    <MapPin className="h-3.5 w-3.5" /> {e.location}
                  </p>
                )}
              </GlassCard>
            </Tilt3D>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
