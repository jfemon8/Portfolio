import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { FileText, ExternalLink, Quote } from 'lucide-react';
import { Section, SectionHeading } from '@/components/shared/Section';
import { useSectionCopy } from '@/hooks/useSectionCopy';
import { useSiteCopy } from '@/hooks/useSiteCopy';
import GlassCard from '@/components/shared/GlassCard';
import Reveal from '@/components/motion/Reveal';
import { Button } from '@/components/ui/button';
import Async from '@/components/ui/Async';
import { PublicationCardSkeleton } from '@/components/ui/Skeletons';
import { usePublications } from '@/hooks/usePortfolio';

/** Generic research/ML pipeline motif — decorative, theme-token driven. */
const STAGES = ['Dataset', 'Resampling', 'Ensemble', 'Detection'];

function Pipeline({ stages }: { stages: string[] }) {
  const reduce = useReducedMotion();
  return (
    <div
      aria-hidden
      className="mb-12 flex flex-wrap items-center gap-2 font-mono text-2xs text-muted-foreground"
    >
      {stages.map((s, i) => (
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
          {i < stages.length - 1 && (
            <span className="hidden h-px w-6 bg-border/70 sm:block" />
          )}
        </div>
      ))}
    </div>
  );
}

// Self-hiding: reserves no space until a previous visit proved there are publications to show.
export default function Research() {
  const publicationsQuery = usePublications();
  const copy = useSectionCopy('research', {
    index: '~/research',
    title: 'Research',
    subtitle: 'Peer-reviewed work & academic publications.',
  });
  const lab = useSiteCopy('labels', { researchStages: STAGES });

  const frame = (children: ReactNode): ReactNode => (
    <Section id="research">
      <SectionHeading
        index={copy.index}
        title={copy.title}
        subtitle={copy.subtitle}
      />

      <Pipeline stages={lab.researchStages} />

      <div className="grid gap-6 lg:grid-cols-2">{children}</div>
    </Section>
  );

  return (
    <Async
      query={publicationsQuery}
      select={(r) => r.data}
      hint="publications"
      fallbackCount={2}
      selfHiding
      skeleton={(n) => frame(<PublicationCardSkeleton count={n} />)}
    >
      {(pubs) =>
        frame(
          pubs.map((p, i) => (
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
                    <a href={p.url} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" /> Read paper
                      </Button>
                    </a>
                  </div>
                )}
              </GlassCard>
            </Reveal>
          ))
        )
      }
    </Async>
  );
}
