import { cn } from '@/lib/cn';

// Pure SVG data-URI noise overlay (no JS); sits above backdrops, below content.
const NOISE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>";

export default function Noise({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay',
        className
      )}
      style={{ backgroundImage: `url("${NOISE}")`, backgroundSize: '160px' }}
    />
  );
}
