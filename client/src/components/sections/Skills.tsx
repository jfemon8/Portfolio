import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Section, SectionHeading } from '@/components/shared/Section';
import { useSectionCopy } from '@/hooks/useSectionCopy';
import { useSiteCopy } from '@/hooks/useSiteCopy';
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
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            >
              {items.map((s) => (
                <motion.li
                  key={s._id}
                  variants={{
                    hidden: { opacity: 0, y: 16, scale: 0.95 },
                    show: { opacity: 1, y: 0, scale: 1 },
                  }}
                  whileHover={reduce ? undefined : { y: -4 }}
                  className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-xl transition-all duration-300 hover:border-primary/40 hover:shadow-neon-glow"
                >
                  {/* Hover-only diagonal sheen for a touch of depth. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent to-primary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  />
                  <div className="relative flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-neon">
                      {s.name}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground/80 transition-colors group-hover:text-neon">
                      {s.level}%
                    </span>
                  </div>
                  <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-border/40">
                    <motion.span
                      initial={reduce ? { width: `${s.level}%` } : { width: 0 }}
                      whileInView={{ width: `${s.level}%` }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.9,
                        delay: 0.15,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="block h-full rounded-full bg-gradient-to-r from-primary to-neon-blue"
                    />
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </AnimatePresence>
        </>
      )}
    </Section>
  );
}
