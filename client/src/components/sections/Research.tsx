import { motion, useReducedMotion } from 'motion/react';
import { FileText, ExternalLink, Quote } from 'lucide-react';
import { Section, SectionHeading } from '@/components/shared/Section';
import GlassCard from '@/components/shared/GlassCard';
import Reveal from '@/components/motion/Reveal';
import Magnetic from '@/components/motion/Magnetic';
import { Button } from '@/components/ui/button';
import { usePublications } from '@/hooks/usePortfolio';

/** Generic research/ML pipeline motif — decorative, theme-token driven. */
const STAGES = ['Dataset', 'Resampling', 'Ensemble', 'Detection'];

function Pipeline() {
  const reduce = useReducedMotion();
  return (
    <div
      aria-hidden
      className="mb-12 flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground"
    >
      {STAGES.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <motion.span
            className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-foreground"
            animate={reduce ? undefined : { opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 2,
              delay: i * 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {s}
          </motion.span>
          {i < STAGES.length - 1 && <span className="h-px w-6 bg-border/70" />}
        </div>
      ))}
    </div>
  );
}

/**
 * Dedicated research showcase — premium publication cards + a decorative
 * pipeline motif. Self-hides when there are no publications (admin-managed).
 * Reuses Section/GlassCard/Reveal/Magnetic (project rule #3/#8).
 */
export default function Research() {
  const { data } = usePublications();
  const pubs = data?.data ?? [];
  if (pubs.length === 0) return null;

  return (
    <Section id="research">
      <SectionHeading
        index="~/research"
        title="Research"
        subtitle="Peer-reviewed work & academic publications."
      />

      <Pipeline />

      <div className="grid gap-6 lg:grid-cols-2">
        {pubs.map((p, i) => (
          <Reveal key={p._id} delay={i * 0.08}>
            <GlassCard interactive className="flex h-full flex-col p-6">
              <div className="mb-3 flex items-center gap-2 font-mono text-xs text-muted-foreground/70">
                <FileText className="h-4 w-4 text-neon" />
                <span>{[p.venue, p.year].filter(Boolean).join(' · ')}</span>
              </div>

              <h3 className="text-lg font-bold leading-snug text-foreground">
                {p.title}
              </h3>

              {p.authors && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {p.authors}
                </p>
              )}

              {p.abstract && (
                <p className="mt-4 flex-1 gap-2 text-sm leading-relaxed text-muted-foreground/80">
                  <Quote className="mr-1 inline h-3.5 w-3.5 text-neon/70" />
                  <span className="line-clamp-5">{p.abstract}</span>
                </p>
              )}

              {p.url && (
                <div className="mt-6">
                  <Magnetic strength={0.35}>
                    <a href={p.url} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" /> Read paper
                      </Button>
                    </a>
                  </Magnetic>
                </div>
              )}
            </GlassCard>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
