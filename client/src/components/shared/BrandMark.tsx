import { cn } from '@/lib/cn';

interface BrandMarkProps {
  className?: string;
}

// Same mark as favicon.svg (kept in sync by hand); uses theme tokens instead of a hardcoded hex so it stays theme-aware in-app.
export default function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('h-8 w-8', className)}
      role="img"
      aria-label="Emon logo"
    >
      <rect width="64" height="64" rx="14" className="fill-bg-elevated" />
      <text
        x="32"
        y="34"
        dominantBaseline="middle"
        textAnchor="middle"
        fontFamily="'JetBrains Mono', 'Fira Code', monospace"
        fontSize="25"
        fontWeight="800"
        letterSpacing="-1.5"
        className="fill-neon"
      >
        {'<E/>'}
      </text>
    </svg>
  );
}
