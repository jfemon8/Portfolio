import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  /** subtle gradient border + glow on hover */
  interactive?: boolean;
}

/** The single glass surface primitive — frosted, token-driven, theme-aware. */
const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // -md not -xl: cheaper to recomposite over the animated background.
        'relative rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md',
        interactive && 'glass-hover',
        className
      )}
      {...props}
    />
  )
);
GlassCard.displayName = 'GlassCard';

export default GlassCard;
