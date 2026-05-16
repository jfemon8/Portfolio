import { Section, SectionHeading } from '@/components/ui/Section';
import Reveal from '@/components/ui/Reveal';
import { Languages, Sparkles } from 'lucide-react';
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
  return (
    <Section id="about">
      <SectionHeading index="01." title="About me" />
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <p className="text-balance leading-relaxed text-ink-soft">
            {profile?.summary}
          </p>

          <div className="mt-8">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink">
              <Sparkles className="h-4 w-4 text-neon" /> What I bring
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {personalSkills.map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-2 rounded-lg border border-line bg-bg-card/60 px-3 py-2 text-sm text-ink-soft"
                >
                  <span className="text-neon">▹</span>
                  {s}
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="glass space-y-5 p-6">
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink">
                <Languages className="h-4 w-4 text-neon" /> Languages
              </h3>
              <div className="space-y-3">
                {(profile?.languages ?? []).map((l) => (
                  <div
                    key={l.name}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-ink-soft">{l.name}</span>
                    <span className="chip">{l.level}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-line pt-5">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-dim">Email</dt>
                  <dd className="truncate text-ink-soft">{profile?.email}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-dim">Phone</dt>
                  <dd className="text-ink-soft">{profile?.phone}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-dim">Status</dt>
                  <dd className="text-neon">
                    {profile?.available ? 'Open to work' : 'Building'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
