import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Section, SectionHeading } from '@/components/shared/Section';
import { useSectionCopy } from '@/hooks/useSectionCopy';
import { useSiteCopy } from '@/hooks/useSiteCopy';
import SkillOrbit from '@/components/motion/SkillOrbit';
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
  const featured = skills.filter((s) => s.featured);
  const orbitNames = (featured.length ? featured : skills)
    .slice(0, 12)
    .map((s) => s.name);
  const copy = useSectionCopy('skills', {
    index: '02.',
    title: 'Skills & tech',
    subtitle: 'The stack I build with — explore by category.',
  });
  const lab = useSiteCopy('labels', {
    catLanguage: 'Languages',
    catFramework: 'Frameworks',
    catDatabase: 'Databases',
    catTool: 'Tools',
    catCloud: 'Cloud',
    catConcept: 'Concepts',
  });
  const catLabel: Record<SkillCategory, string> = {
    language: lab.catLanguage,
    framework: lab.catFramework,
    database: lab.catDatabase,
    tool: lab.catTool,
    cloud: lab.catCloud,
    concept: lab.catConcept,
    other: lab.catConcept,
  };

  return (
    <Section id="skills">
      <SectionHeading
        index={copy.index}
        title={copy.title}
        subtitle={copy.subtitle}
      />

      {isLoading && <Spinner />}
      {isError && <ErrorState onRetry={() => void refetch()} />}

      {!isLoading && !isError && (
        <>
          <SkillOrbit skills={orbitNames} className="mb-14 hidden sm:block" />
          {/* P13.5 — mobile-only static stack visual (the animated orbit
              overflows narrow viewports, so phones get a calmer medallion
              + featured-chip cloud). Decorative; tabs below remain the
              accessible source of truth. */}
          <div
            aria-hidden
            className="mb-10 flex flex-col items-center sm:hidden"
          >
            <div className="grid h-20 w-20 place-items-center rounded-full border border-primary/30 bg-primary/10 text-center font-mono text-[11px] font-semibold leading-tight text-neon shadow-glow">
              my
              <br />
              stack
            </div>
            {orbitNames.length > 0 && (
              <div className="mt-6 flex max-w-md flex-wrap justify-center gap-2">
                {orbitNames.slice(0, 8).map((name) => (
                  <span
                    key={name}
                    className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>
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
                  <span className="relative">{catLabel[g.key]}</span>
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
                  <span className="ml-2 font-mono text-[11px] text-muted-foreground/60 transition-colors group-hover:text-neon sm:text-muted-foreground/0">
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
