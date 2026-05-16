import { Section, SectionHeading } from '@/components/ui/Section';
import Reveal from '@/components/ui/Reveal';
import { useCertifications, usePublications } from '@/hooks/usePortfolio';
import { Award, Trophy, FileText, ExternalLink } from 'lucide-react';

export default function Credentials() {
  const { data: certData } = useCertifications();
  const { data: pubData } = usePublications();
  const all = certData?.data ?? [];
  const certs = all.filter((c) => c.category === 'certification');
  const achievements = all.filter((c) => c.category === 'achievement');
  const publications = pubData?.data ?? [];

  return (
    <Section id="credentials" className="bg-bg-soft/40">
      <SectionHeading
        index="06."
        title="Credentials"
        subtitle="Certifications, achievements & research."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Reveal>
          <div className="glass h-full p-6">
            <h3 className="mb-5 flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-wider text-neon">
              <Award className="h-4 w-4" /> Certifications
            </h3>
            <ul className="space-y-4">
              {certs.map((c) => (
                <li key={c._id} className="border-l-2 border-line pl-3">
                  <p className="text-sm font-medium text-ink">{c.title}</p>
                  {c.issuer && (
                    <p className="text-xs text-ink-dim">{c.issuer}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="glass h-full p-6">
            <h3 className="mb-5 flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-wider text-neon">
              <Trophy className="h-4 w-4" /> Achievements
            </h3>
            <ul className="space-y-4">
              {achievements.map((c) => (
                <li key={c._id} className="border-l-2 border-line pl-3">
                  <p className="text-sm font-medium text-ink">{c.title}</p>
                  {c.issuer && (
                    <p className="text-xs text-ink-dim">{c.issuer}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={0.16}>
          <div className="glass h-full p-6">
            <h3 className="mb-5 flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-wider text-neon">
              <FileText className="h-4 w-4" /> Publications
            </h3>
            <ul className="space-y-4">
              {publications.map((p) => (
                <li key={p._id} className="border-l-2 border-line pl-3">
                  <p className="text-sm font-medium text-ink">{p.title}</p>
                  {p.venue && (
                    <p className="text-xs text-ink-dim">{p.venue}</p>
                  )}
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-neon"
                    >
                      Read <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
