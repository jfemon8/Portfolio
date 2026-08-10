import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Section, SectionHeading } from '@/components/shared/Section';
import { useSectionCopy } from '@/hooks/useSectionCopy';
import { Spinner, ErrorState } from '@/components/ui/States';
import { useSkills, useCategories } from '@/hooks/usePortfolio';
import { staggerContainer } from '@/config/animation';
import { getSkillIcon, FallbackSkillIcon } from '@/lib/skillIcon';
import { cn } from '@/lib/cn';
import SmartImage from '@/components/shared/SmartImage';

/** Icon resolves as uploaded `iconImage` → react-icons brand match → neutral glyph; category tabs are driven by the /categories CRUD. */
export default function Skills() {
  const {
    data: skillsData,
    isLoading: skillsLoading,
    isError: skillsError,
    refetch,
  } = useSkills();
  const { data: categoriesData, isLoading: categoriesLoading } =
    useCategories();
  const reduce = useReducedMotion();

  const skills = useMemo(() => skillsData?.data ?? [], [skillsData]);
  const categories = useMemo(
    () => categoriesData?.data ?? [],
    [categoriesData]
  );

  // Only show category tabs that contain at least one skill.
  const available = useMemo(
    () => categories.filter((c) => skills.some((s) => s.category === c.slug)),
    [skills, categories]
  );
  const [active, setActive] = useState<string>('');
  const activeSlug = available.some((g) => g.slug === active)
    ? active
    : (available[0]?.slug ?? '');

  const items = skills.filter((s) => s.category === activeSlug);
  const copy = useSectionCopy('skills', {
    index: '02.',
    title: 'Skills & tech',
    subtitle: 'The stack I build with — explore by category.',
  });

  const isLoading = skillsLoading || categoriesLoading;

  return (
    <Section id="skills">
      <SectionHeading
        index={copy.index}
        title={copy.title}
        subtitle={copy.subtitle}
      />

      {isLoading && <Spinner />}
      {skillsError && <ErrorState onRetry={() => void refetch()} />}

      {!isLoading && !skillsError && (
        <>
          <div className="mb-10 flex flex-wrap gap-2">
            {available.map((g) => {
              const on = g.slug === activeSlug;
              return (
                <button
                  key={g.slug}
                  onClick={() => setActive(g.slug)}
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
                      className="absolute inset-0 rounded-full border border-primary/40 bg-primary/10 backdrop-blur-md backdrop-saturate-150 backdrop-brightness-105"
                      transition={{
                        type: 'spring',
                        stiffness: 320,
                        damping: 28,
                      }}
                    />
                  )}
                  <span className="relative">{g.name}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.ul
              key={activeSlug}
              variants={staggerContainer(0.04)}
              initial={reduce ? false : 'hidden'}
              animate="show"
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            >
              {items.map((s) => {
                const BrandIcon = s.iconImage
                  ? null
                  : (getSkillIcon(s.name) ?? FallbackSkillIcon);
                return (
                  <motion.li
                    key={s._id}
                    variants={{
                      hidden: { opacity: 0, y: 16, scale: 0.95 },
                      show: { opacity: 1, y: 0, scale: 1 },
                    }}
                    className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-md transition-all duration-300 hover:border-primary/40"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent to-primary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    />
                    <div className="relative flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border/60 bg-background/40">
                        {s.iconImage ? (
                          <SmartImage
                            src={s.iconImage}
                            alt=""
                            imgWidth={64}
                            className="h-6 w-6 object-contain"
                          />
                        ) : BrandIcon ? (
                          <BrandIcon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-neon" />
                        ) : null}
                      </span>
                      <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-neon">
                          {s.name}
                        </span>
                        <span className="font-mono text-2xs text-muted-foreground/80 transition-colors group-hover:text-neon">
                          {s.level}%
                        </span>
                      </div>
                    </div>
                    <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-border/40">
                      {/* scaleX, not width — width triggers layout on every tick. */}
                      <motion.span
                        initial={
                          reduce ? { scaleX: s.level / 100 } : { scaleX: 0 }
                        }
                        whileInView={{ scaleX: s.level / 100 }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.9,
                          delay: 0.15,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="block h-full w-full origin-left rounded-full bg-gradient-to-r from-primary to-neon-blue"
                      />
                    </div>
                  </motion.li>
                );
              })}
            </motion.ul>
          </AnimatePresence>
        </>
      )}
    </Section>
  );
}
