import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { duration, ease, viewportOnce } from '@/config/animation';
import { cn } from '@/lib/cn';

interface SectionProps {
  id?: string;
  className?: string;
  children: ReactNode;
}

/**
 * The canonical premium section frame — consistent rhythm + scroll-anchor.
 * Every public section uses this (project rule #3/#8).
 */
export function Section({ id, className, children }: SectionProps) {
  return (
    <section
      id={id}
      className={cn('relative scroll-mt-24 py-24 sm:py-32', className)}
    >
      <div className="container-x">{children}</div>
    </section>
  );
}

interface SectionHeadingProps {
  index?: string;
  title: ReactNode;
  subtitle?: string;
  /** optional right-aligned slot (e.g. a "view all" link) */
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
  const reduce = useReducedMotion();
  const centered = align === 'center';

  return (
    <div
      className={cn(
        'mb-14 flex flex-wrap items-end gap-6',
        centered ? 'flex-col text-center' : 'justify-between'
      )}
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewportOnce}
        transition={{ duration: duration.slow, ease: ease.out }}
        className={cn('max-w-2xl', centered && 'mx-auto')}
      >
        {index && (
          <span className="font-mono text-sm font-medium text-neon">
            {index}
          </span>
        )}
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          {title} <span className="text-neon">.</span>
        </h2>
        {subtitle && (
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
      </motion.div>
      {action && <div className="mb-1 shrink-0">{action}</div>}
    </div>
  );
}
