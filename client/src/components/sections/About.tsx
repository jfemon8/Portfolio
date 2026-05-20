import { Languages, Sparkles } from 'lucide-react';
import { Section, SectionHeading } from '@/components/shared/Section';
import { useSectionCopy } from '@/hooks/useSectionCopy';
import { useSiteCopy } from '@/hooks/useSiteCopy';
import Reveal from '@/components/motion/Reveal';
import GlassCard from '@/components/shared/GlassCard';
import Counter from '@/components/shared/Counter';
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
        </Reveal>
      </div>
    </Section>
  );
}
