import { motion } from 'framer-motion';
import {
  ArrowRight,
  Download,
  Github,
  Linkedin,
  Mail,
  Code2,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import { useTypewriter } from '@/hooks/useTypewriter';
import { track } from '@/lib/api';
import type { ProfileDoc } from '@/types';

const iconMap: Record<string, LucideIcon> = {
  github: Github,
  linkedin: Linkedin,
  mail: Mail,
  code: Code2,
};

interface HeroProps {
  profile?: ProfileDoc;
  onContact: () => void;
  onProjects: () => void;
}

export default function Hero({ profile, onContact, onProjects }: HeroProps) {
  const roles = profile?.roles?.length
    ? profile.roles
    : ['Front-End Developer', 'MERN Stack Developer'];
  const typed = useTypewriter(roles);

  return (
    <section
      id="home"
      className="relative flex min-h-[calc(100vh-4rem)] items-center"
    >
      <div className="container-x grid items-center gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Left: intro */}
        <div>
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="chip mb-5"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-neon" />
            {profile?.available
              ? 'Available for opportunities'
              : 'Currently building'}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-balance text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl"
          >
            Hi, I'm{' '}
            <span className="gradient-text">
              {profile?.name || 'Md Jannatul Ferdhous Emon'}
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-4 flex items-center gap-2 font-mono text-lg text-ink-soft sm:text-xl"
          >
            <span className="text-neon">&gt;</span>
            <span>{typed}</span>
            <span className="inline-block h-5 w-2 animate-blink bg-neon" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-6 max-w-xl text-balance text-ink-soft"
          >
            {profile?.tagline ||
              'I build responsive, dynamic & scalable web apps with the MERN stack.'}
          </motion.p>

          {profile?.location && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-dim">
              <MapPin className="h-4 w-4" /> {profile.location}
            </p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <button onClick={onProjects} className="btn-primary">
              View Projects <ArrowRight className="h-4 w-4" />
            </button>
            {profile?.resumeUrl && (
              <a
                href={profile.resumeUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => track('resume_download', '/', 'hero')}
                className="btn-outline"
              >
                <Download className="h-4 w-4" /> Resume
              </a>
            )}
            <button onClick={onContact} className="btn-ghost">
              Contact me
            </button>
          </motion.div>

          <div className="mt-8 flex items-center gap-3">
            {(profile?.socials ?? []).map((s) => {
              const Icon = iconMap[s.icon] ?? Code2;
              return (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  onClick={() => track('social_click', '/', s.label)}
                  className="rounded-xl border border-line bg-bg-card p-2.5 text-ink-soft transition-all hover:-translate-y-1 hover:border-neon/50 hover:text-neon"
                >
                  <Icon className="h-5 w-5" />
                </a>
              );
            })}
          </div>
        </div>

        {/* Right: terminal card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="glass overflow-hidden"
        >
          <div className="flex items-center gap-2 border-b border-line bg-bg-soft px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
            <span className="ml-2 font-mono text-xs text-ink-dim">
              emon@portfolio: ~
            </span>
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-ink-soft">
            <code>
              <span className="text-neon">$</span> whoami{'\n'}
              <span className="text-ink">
                {profile?.name || 'Md Jannatul Ferdhous Emon'}
              </span>
              {'\n\n'}
              <span className="text-neon">$</span> cat stack.json{'\n'}
              {'{'}
              {'\n'}
              {'  '}
              <span className="text-neon-violet">"frontend"</span>:{' '}
              <span className="text-neon-blue">
                "React, Redux, Next.js, Tailwind"
              </span>
              ,{'\n'}
              {'  '}
              <span className="text-neon-violet">"backend"</span>:{' '}
              <span className="text-neon-blue">"Node, Express, .NET Core"</span>
              ,{'\n'}
              {'  '}
              <span className="text-neon-violet">"database"</span>:{' '}
              <span className="text-neon-blue">"MongoDB, SQL Server"</span>,
              {'\n'}
              {'  '}
              <span className="text-neon-violet">"focus"</span>:{' '}
              <span className="text-neon-blue">"full-stack engineering"</span>
              {'\n'}
              {'}'}
              {'\n\n'}
              <span className="text-neon">$</span> echo $GOALS{'\n'}
              <span className="text-ink">
                Become a well-rounded software engineer 🚀
              </span>
              {'\n'}
              <span className="text-neon">$</span>{' '}
              <span className="inline-block h-4 w-2 animate-blink bg-neon align-middle" />
            </code>
          </pre>

          {profile?.stats && profile.stats.length > 0 && (
            <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
              {profile.stats.map((s) => (
                <div
                  key={s.label}
                  className="bg-bg-card px-3 py-4 text-center"
                >
                  <div className="text-lg font-bold text-neon">{s.value}</div>
                  <div className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-dim">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
