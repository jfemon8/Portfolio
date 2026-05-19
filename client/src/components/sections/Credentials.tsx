import { Award, Trophy, ExternalLink, type LucideIcon } from 'lucide-react';
import { Section, SectionHeading } from '@/components/shared/Section';
import { useSectionCopy } from '@/hooks/useSectionCopy';
import Reveal from '@/components/motion/Reveal';
import GlassCard from '@/components/shared/GlassCard';
import { useCertifications } from '@/hooks/usePortfolio';

interface ColumnItem {
  id: string;
  title: string;
  meta?: string;
  desc?: string;
  url?: string;
}

function Column({
  icon: Icon,
  title,
  items,
  delay,
}: {
  icon: LucideIcon;
  title: string;
  items: ColumnItem[];
  delay: number;
}) {
  return (
    <Reveal delay={delay}>
      <GlassCard interactive className="h-full p-6">
        <h3 className="mb-5 flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-wider text-neon">
          <Icon className="h-4 w-4" /> {title}
        </h3>
        <ul className="space-y-4">
          {items.map((it) => (
            <li key={it.id} className="border-l-2 border-border/70 pl-3">
              <p className="text-sm font-medium text-foreground">{it.title}</p>
              {it.meta && (
                <p className="text-xs text-muted-foreground/70">{it.meta}</p>
              )}
              {it.desc && (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground/70 line-clamp-2">
                  {it.desc}
                </p>
              )}
              {it.url && (
                <a
                  href={it.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-neon hover:underline"
                >
                  Read <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </li>
          ))}
        </ul>
      </GlassCard>
    </Reveal>
  );
}

export default function Credentials() {
  const { data: certData } = useCertifications();
  const all = certData?.data ?? [];

  const certs: ColumnItem[] = all
    .filter((c) => c.category === 'certification')
    .map((c) => ({
      id: c._id,
      title: c.title,
      meta: [c.issuer, c.issueDate].filter(Boolean).join(' · '),
      desc: c.description,
    }));
  const achievements: ColumnItem[] = all
    .filter((c) => c.category === 'achievement')
    .map((c) => ({
      id: c._id,
      title: c.title,
      meta: [c.issuer, c.issueDate].filter(Boolean).join(' · '),
      desc: c.description,
    }));
  const copy = useSectionCopy('credentials', {
    index: '06.',
    title: 'Credentials',
    subtitle: 'Certifications & achievements.',
  });

  return (
    <Section id="credentials">
      <SectionHeading
        index={copy.index}
        title={copy.title}
        subtitle={copy.subtitle}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <Column icon={Award} title="Certifications" items={certs} delay={0} />
        <Column
          icon={Trophy}
          title="Achievements"
          items={achievements}
          delay={0.08}
        />
      </div>
    </Section>
  );
}
