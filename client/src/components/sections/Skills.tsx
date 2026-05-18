import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Section, SectionHeading } from '@/components/shared/Section';
import { Spinner, ErrorState } from '@/components/ui/States';
import { useSkills } from '@/hooks/usePortfolio';
import { staggerContainer } from '@/config/animation';
import { cn } from '@/lib/cn';
import type { SkillCategory } from '@/types';

const groups: { key: SkillCategory; label: string }[] = [
  { key: 'language', label: 'Languages' },
  { key: 'framework', label: 'Frameworks' },
  { key: 'database', label: 'Databases' },
  { key: 'tool', label: 'Tools' },
  { key: 'cloud', label: 'Cloud' },
  { key: 'concept', label: 'Concepts' },
];

/**
 * Interactive skill cloud — NO progress bars (per brief). Category tabs with
 * an animated indicator + a floating, hover-expanding card grid that
 * cross-fades on switch. Reduced-motion safe.
 */
export default function Skills() {
  const { data, isLoading, isError, refetch } = useSkills();
  const reduce = useReducedMotion();
  const skills = useMemo(() => data?.data ?? [], [data]);

  const available = useMemo(
    () => groups.filter((g) => skills.some((s) => s.category === g.key)),
    [skills]
  );
  const [active, setActive] = useState<SkillCategory>('language');
  const activeKey = available.some((g) => g.key === active)
    ? active
    : (available[0]?.key ?? 'language');

  const items = skills.filter((s) => s.category === activeKey);

  return (
    <Section id="skills">
      <SectionHeading
        index="02."
        title="Skills & tech"
        subtitle="The stack I build with — explore by category."
      />

      {isLoading && <Spinner />}
      {isError && <ErrorState onRetry={() => void refetch()} />}

      {!isLoading && !isError && (
        <>
          <div className="mb-10 flex flex-wrap gap-2">
            {available.map((g) => {
              const on = g.key === activeKey;
              return (
                <button
                  key={g.key}
                  onClick={() => setActive(g.key)}
                  className={cn(
                    'relative rounded-full px-4 py-1.5 text-sm transition-colors',
                    on
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {on && (
                    <motion.span
                      layoutId="skill-tab"
                      className="absolute inset-0 rounded-full border border-primary/40 bg-primary/10"
                      transition={{
                        type: 'spring',
                        stiffness: 320,
                        damping: 28,
                      }}
                    />
                  )}
                  <span className="relative">{g.label}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.ul
              key={activeKey}
              variants={staggerContainer(0.04)}
              initial={reduce ? false : 'hidden'}
              animate="show"
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              className="flex flex-wrap gap-3"
            >
              {items.map((s) => (
                <motion.li
                  key={s._id}
                  variants={{
                    hidden: { opacity: 0, y: 16, scale: 0.9 },
                    show: { opacity: 1, y: 0, scale: 1 },
                  }}
                  whileHover={reduce ? undefined : { y: -4, scale: 1.05 }}
                  className="group relative cursor-default rounded-xl border border-border/70 bg-card/50 px-4 py-3 backdrop-blur transition-colors hover:border-primary/50 hover:shadow-glow"
                >
                  <span className="text-sm font-medium text-foreground">
                    {s.name}
                  </span>
                  <span className="ml-2 font-mono text-[11px] text-muted-foreground/0 transition-colors group-hover:text-neon">
                    {s.level}%
                  </span>
                </motion.li>
              ))}
            </motion.ul>
          </AnimatePresence>
        </>
      )}
    </Section>
  );
}
