import { Section, SectionHeading } from '@/components/ui/Section';
import Reveal from '@/components/ui/Reveal';
import { Spinner, ErrorState } from '@/components/ui/States';
import { useSkills } from '@/hooks/usePortfolio';
import type { SkillCategory } from '@/types';

const groups: { key: SkillCategory; label: string }[] = [
  { key: 'language', label: 'Languages' },
  { key: 'framework', label: 'Frameworks & Libraries' },
  { key: 'database', label: 'Databases' },
  { key: 'tool', label: 'Tools' },
  { key: 'cloud', label: 'Cloud & Services' },
  { key: 'concept', label: 'Concepts' },
];

function Bar({ name, level }: { name: string; level: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-ink-soft">{name}</span>
        <span className="font-mono text-xs text-ink-dim">{level}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg-elevated">
        <div
          className="h-full rounded-full bg-neon-gradient"
          style={{ width: `${level}%` }}
        />
      </div>
    </div>
  );
}

export default function Skills() {
  const { data, isLoading, isError, refetch } = useSkills();
  const skills = data?.data ?? [];

  return (
    <Section id="skills" className="bg-bg-soft/40">
      <SectionHeading
        index="02."
        title="Skills & tech"
        subtitle="The tools and technologies I work with day to day."
      />
      {isLoading && <Spinner />}
      {isError && <ErrorState onRetry={refetch} />}
      {!isLoading && !isError && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g, gi) => {
            const items = skills.filter((s) => s.category === g.key);
            if (!items.length) return null;
            return (
              <Reveal key={g.key} delay={gi * 0.05}>
                <div className="glass h-full p-6">
                  <h3 className="mb-5 font-mono text-sm font-semibold uppercase tracking-wider text-neon">
                    {g.label}
                  </h3>
                  <div className="space-y-4">
                    {items.map((s) => (
                      <Bar key={s._id} name={s.name} level={s.level} />
                    ))}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      )}
    </Section>
  );
}
