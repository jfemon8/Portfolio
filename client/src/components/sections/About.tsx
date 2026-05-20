import { Languages, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Section, SectionHeading } from '@/components/shared/Section';
import { useSectionCopy } from '@/hooks/useSectionCopy';
import { useSiteCopy } from '@/hooks/useSiteCopy';
import Reveal from '@/components/motion/Reveal';
import GlassCard from '@/components/shared/GlassCard';
import Counter from '@/components/shared/Counter';
import ResumeViewer from '@/components/shared/ResumeViewer';
import FloatingTechIcons from '@/components/motion/FloatingTechIcons';
import type { ProfileDoc } from '@/types';

const personalSkills = [
  'Analytical & problem-solving',
  'Logical & structural thinking',
  'Good communication',
  'Team collaboration',
  'Effective time management',
  'Fast learner & adaptable',
];

export default function About({ profile }: { profile?: ProfileDoc }) {
  const reduce = useReducedMotion();
  const stats = profile?.stats ?? [];
  const copy = useSectionCopy('about', {
    index: '01.',
    title: 'About me',
    subtitle: 'Who I am, how I think, and what I bring to a team.',
  });
  const about = useSiteCopy('about', {
    strengthsHeading: 'What I bring',
    strengths: personalSkills,
  });

  return (
    <Section id="about">
      <FloatingTechIcons />
      <SectionHeading
        index={copy.index}
        title={copy.title}
        subtitle={copy.subtitle}
      />

      <div className="grid gap-6 sm:gap-10 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <p className="text-balance text-lg leading-relaxed text-muted-foreground">
            {profile?.summary}
          </p>

          {stats.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map((s) => (
                <GlassCard key={s.label} className="p-4 text-center">
                  <Counter
                    value={s.value}
                    className="block text-2xl font-extrabold text-neon"
                  />
                  <span className="mt-1 block text-[11px] uppercase tracking-wide text-muted-foreground/70">
                    {s.label}
                  </span>
                </GlassCard>
              ))}
            </div>
          )}

          <div className="mt-9">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
              <Sparkles className="h-4 w-4 text-neon" />{' '}
              {about.strengthsHeading}
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {about.strengths.map((s, i) => (
                <Reveal key={s} delay={i * 0.04}>
                  <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/50 px-3 py-2 text-sm text-muted-foreground backdrop-blur">
                    <span className="text-neon">▹</span>
                    {s}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="space-y-4 sm:space-y-6">
            {/* Avatar + identity + View-Resume affordance — premium glass
                profile card that anchors the right column. The gradient
                ring + soft halo glow + pinging "available" dot give it the
                eye-catching feel without going overboard. */}
            <GlassCard className="p-6 text-center">
              <motion.div
                initial={reduce ? false : { opacity: 0, scale: 0.92 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                whileHover={reduce ? undefined : { scale: 1.03 }}
                className="relative mx-auto h-44 w-44 sm:h-48 sm:w-48"
              >
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-full bg-gradient-to-tr from-primary/30 via-neon-blue/30 to-neon-violet/30 blur-3xl"
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary via-neon-blue to-neon-violet p-[3px] shadow-glow">
                  <div className="h-full w-full overflow-hidden rounded-full bg-card">
                    {profile?.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={profile?.name || 'Avatar'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-4xl font-bold text-muted-foreground">
                        {profile?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                </div>
                {profile?.available && (
                  <span
                    aria-label="Available for opportunities"
                    className="absolute bottom-3 right-3 flex h-6 w-6 items-center justify-center rounded-full border-4 border-background bg-emerald-500"
                  >
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  </span>
                )}
              </motion.div>

              <h3 className="mt-5 text-lg font-bold text-foreground">
                {profile?.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {profile?.title}
              </p>

              {profile?.resumeUrl && (
                <div className="mt-5 flex justify-center">
                  <ResumeViewer
                    url={profile.resumeUrl}
                    size="lg"
                    className="w-full sm:w-auto"
                  />
                </div>
              )}
            </GlassCard>

            <GlassCard className="space-y-3 p-6 sm:space-y-5">
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
                  <Languages className="h-4 w-4 text-neon" /> Languages
                </h3>
                <div className="space-y-3">
                  {(profile?.languages ?? []).map((l) => (
                    <div
                      key={l.name}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-muted-foreground">
                        {l.name}
                      </span>
                      <span className="rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
                        {l.level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-border/70 pt-5">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground/70">Email</dt>
                    <dd className="break-words text-muted-foreground">
                      {profile?.email}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground/70">Phone</dt>
                    <dd className="text-muted-foreground">{profile?.phone}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground/70">Status</dt>
                    <dd className="font-medium text-neon">
                      {profile?.available ? 'Open to work' : 'Building'}
                    </dd>
                  </div>
                </dl>
              </div>
            </GlassCard>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
