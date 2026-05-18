import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  /** subtle gradient border + glow on hover */
  interactive?: boolean;
}

/**
 * The single glass surface primitive — frosted, token-driven, theme-aware.
 * Used by every premium card/panel (project rule #3/#8).
 */
const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xl',
        'shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_24px_60px_-30px_rgba(0,0,0,0.7)]',
        interactive &&
          'transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow',
        className
      )}
      {...props}
    />
  )
);
GlassCard.displayName = 'GlassCard';

export default GlassCard;
