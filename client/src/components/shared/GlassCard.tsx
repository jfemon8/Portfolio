import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  /** subtle gradient border + glow on hover */
  interactive?: boolean;
}

/** The single glass surface primitive — Liquid Glass material, token-driven, theme-aware. */
const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('glass', interactive && 'glass-hover', className)}
      {...props}
    />
  )
);
GlassCard.displayName = 'GlassCard';

export default GlassCard;
