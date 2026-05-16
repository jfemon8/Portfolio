import type { ReactNode } from 'react';
import Reveal from './Reveal';

interface SectionProps {
  id?: string;
  className?: string;
  children: ReactNode;
}

export function Section({ id, className = '', children }: SectionProps) {
  return (
    <section id={id} className={`scroll-mt-24 py-20 sm:py-28 ${className}`}>
      <div className="container-x">{children}</div>
    </section>
  );
}

interface SectionHeadingProps {
  index?: string;
  title: string;
  subtitle?: string;
}

export function SectionHeading({
  index,
  title,
  subtitle,
}: SectionHeadingProps) {
  return (
    <Reveal className="mb-12 max-w-2xl">
      {index && <span className="font-mono text-sm text-neon">{index}</span>}
      <h2 className="section-title mt-1">
        {title} <span className="text-neon">.</span>
      </h2>
      {subtitle && <p className="mt-3 text-ink-soft">{subtitle}</p>}
    </Reveal>
  );
}
