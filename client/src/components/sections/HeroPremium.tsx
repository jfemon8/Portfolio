import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Download, MapPin } from 'lucide-react';
import { useTypewriter } from '@/hooks/useTypewriter';
import { useSiteCopy } from '@/hooks/useSiteCopy';
import { track } from '@/lib/api';
import { duration, ease } from '@/config/animation';
import Spotlight from '@/components/motion/Spotlight';
import Particles from '@/components/motion/Particles';
import Magnetic from '@/components/motion/Magnetic';
import GlassCard from '@/components/shared/GlassCard';
import SmartImage from '@/components/shared/SmartImage';
import { Button } from '@/components/ui/button';
import { SocialIcon } from '@/lib/socialIcon';
import { proxyFileUrl } from '@/lib/fileProxy';
import type { ProfileDoc } from '@/types';

interface HeroPremiumProps {
  profile?: ProfileDoc;
  /** Optional admin-set background image (subtle, behind the premium layers). */
  background?: string;
  onContact: () => void;
  onProjects: () => void;
}

export default function HeroPremium({
  profile,
  background,
  onContact,
  onProjects,
}: HeroPremiumProps) {
  const reduce = useReducedMotion();
  const roles = profile?.roles?.length
    ? profile.roles
    : ['Front-End Developer', 'MERN Stack Developer'];
  const typed = useTypewriter(roles);
  const hero = useSiteCopy('hero', {
    availableBadge: 'Available for opportunities',
    unavailableBadge: 'Currently building',
    greeting: "Hi, I'm",
    ctaProjects: 'View Projects',
    ctaResume: 'Resume',
    ctaContact: 'Contact me',
    scrollLabel: 'Scroll down',
    terminalTitle: 'emon@portfolio: ~',
    whoamiCmd: 'whoami',
    stackCmd: 'cat stack.json',
    stack: [
      { label: 'frontend', value: 'React, Next.js, Tailwind' },
      { label: 'backend', value: 'Node, Express, .NET' },
      { label: 'database', value: 'MongoDB, SQL Server' },
    ],
    goalsCmd: 'echo $GOALS',
    goalsText: 'Become a well-rounded software engineer 🚀',
  });

  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: duration.slow, ease: ease.out, delay },
  });

  return (
    <section id="hero" className="relative overflow-hidden">
      {background && (
        <SmartImage
          src={background}
          alt=""
          aria-hidden
          priority
          imgWidth={1920}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
        />
      )}
      <Spotlight className="flex items-center lg:min-h-[100svh]">
        <Particles count={28} />

        <div className="container-x relative z-10 grid items-center gap-6 py-12 sm:gap-10 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14 lg:py-24">
          {/* Left — identity */}
          <div>
            <motion.span
              {...rise(0)}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/50 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-neon" />
              </span>
              {profile?.available ? hero.availableBadge : hero.unavailableBadge}
            </motion.span>

            <motion.h1
              {...rise(0.06)}
              className="mt-6 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
            >
              {hero.greeting}{' '}
              <span className="gradient-text">
                {profile?.name || 'Md Jannatul Ferdhous Emon'}
              </span>
            </motion.h1>

            <motion.div
              {...rise(0.12)}
              className="mt-5 flex flex-wrap items-center gap-2 font-mono text-lg text-muted-foreground sm:text-2xl"
            >
              <span className="text-neon">&gt;</span>
              <span className="min-w-0 break-words text-foreground">
                {typed}
              </span>
              <span className="inline-block h-6 w-[3px] animate-blink bg-neon" />
            </motion.div>

            <motion.p
              {...rise(0.18)}
              className="mt-7 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              {profile?.tagline ||
                'I build responsive, dynamic & scalable web apps with the MERN stack.'}
            </motion.p>

            {profile?.location && (
              <motion.p
                {...rise(0.22)}
                className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground/80"
              >
                <MapPin className="h-4 w-4" /> {profile.location}
              </motion.p>
            )}

            <motion.div
              {...rise(0.28)}
              className="mt-9 flex flex-wrap items-center gap-3"
            >
              <Magnetic strength={0.4}>
                <Button size="lg" onClick={onProjects}>
                  {hero.ctaProjects} <ArrowRight className="h-4 w-4" />
                </Button>
              </Magnetic>
              {profile?.resumeUrl && (
                <Magnetic strength={0.4}>
                  <a
                    href={proxyFileUrl(profile.resumeUrl, 'resume.pdf', false)}
                    download
                    onClick={() => track('resume_download', '/', 'hero')}
                  >
                    <Button size="lg" variant="outline">
                      <Download className="h-4 w-4" /> {hero.ctaResume}
                    </Button>
                  </a>
                </Magnetic>
              )}
              <Button size="lg" variant="ghost" onClick={onContact}>
                {hero.ctaContact}
              </Button>
            </motion.div>

            <motion.div
              {...rise(0.34)}
              className="mt-9 flex items-center gap-3"
            >
              {(profile?.socials ?? []).map((s) => (
                <Magnetic key={s.label} strength={0.5}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.label}
                    onClick={() => track('social_click', '/', s.label)}
                    className="grid h-11 w-11 place-items-center rounded-xl border border-border/70 bg-card/50 text-muted-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <SocialIcon social={s} />
                  </a>
                </Magnetic>
              ))}
            </motion.div>
          </div>

          {/* Right — terminal glass card */}
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.94, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.7, ease: ease.out }}
          >
            <GlassCard className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border/70 bg-background/40 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  {hero.terminalTitle}
                </span>
              </div>
              <pre className="whitespace-pre-wrap break-words p-5 font-mono text-[11px] leading-relaxed text-muted-foreground sm:text-[13px]">
                <code>
                  <span className="text-neon">$</span> {hero.whoamiCmd}
                  {'\n'}
                  <span className="text-foreground">
                    {profile?.name || 'Md Jannatul Ferdhous Emon'}
                  </span>
                  {'\n\n'}
                  <span className="text-neon">$</span> {hero.stackCmd}
                  {'\n'}
                  {'{'}
                  {hero.stack.map((e, i) => (
                    <span key={e.label}>
                      {'\n'}{' '}
                      <span className="text-neon-violet">"{e.label}"</span>:{' '}
                      <span className="text-neon-blue">"{e.value}"</span>
                      {i < hero.stack.length - 1 ? ',' : ''}
                    </span>
                  ))}
                  {'\n'}
                  {'}'}
                  {'\n\n'}
                  <span className="text-neon">$</span> {hero.goalsCmd}
                  {'\n'}
                  <span className="text-foreground">{hero.goalsText}</span>
                  {'\n'}
                  <span className="text-neon">$</span>{' '}
                  <span className="inline-block h-4 w-2 animate-blink bg-neon align-middle" />
                </code>
              </pre>
              {profile?.stats && profile.stats.length > 0 && (
                <div className="grid grid-cols-2 gap-px border-t border-border/70 bg-border/40 sm:grid-cols-4">
                  {profile.stats.map((s) => (
                    <div
                      key={s.label}
                      className="bg-card/60 px-3 py-4 text-center"
                    >
                      <div className="text-lg font-bold text-neon">
                        {s.value}
                      </div>
                      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground/70">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>
      </Spotlight>
    </section>
  );
}
