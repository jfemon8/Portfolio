import { type ReactNode } from 'react';
import Reveal from '@/components/motion/Reveal';
import { cn } from '@/lib/cn';

interface SectionProps {
  id?: string;
  className?: string;
  children: ReactNode;
}

/** Shared section frame. */
export function Section({ id, className, children }: SectionProps) {
  return (
    <section id={id} className={cn('relative py-4', className)}>
      <div className="container-x">{children}</div>
    </section>
  );
}

interface SectionHeadingProps {
  index?: string;
  title: ReactNode;
  subtitle?: string;
  /** Optional right-aligned slot. */
  action?: ReactNode;
  align?: 'left' | 'center';
}

export function SectionHeading({
  index,
  title,
  subtitle,
  action,
  align = 'left',
}: SectionHeadingProps) {
  const centered = align === 'center';

  return (
    <div
      className={cn(
        'mb-4 flex flex-wrap items-end gap-4',
        centered ? 'flex-col text-center' : 'justify-between'
      )}
    >
      <Reveal className={cn(centered && 'mx-auto')}>
        {index && (
          <span className="font-mono text-sm font-medium text-neon">
            {index}
          </span>
        )}
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl 3xl:text-6xl">
          {title} <span className="text-neon">.</span>
        </h2>
        {subtitle && (
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
      </Reveal>
      {action && <div className="mb-1 w-full shrink-0 md:w-auto">{action}</div>}
    </div>
  );
}
