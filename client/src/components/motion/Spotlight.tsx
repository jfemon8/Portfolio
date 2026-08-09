import { useRef, type ReactNode } from 'react';
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useReducedMotion,
} from 'motion/react';

interface SpotlightProps {
  children: ReactNode;
  className?: string;
  /** spotlight radius in px */
  size?: number;
  /** CSS color (defaults to brand primary) */
  color?: string;
}

// Mouse-follow spotlight for hero/section backdrops; background-only compositor work keeps it cheap, reduced-motion safe.
export default function Spotlight({
  children,
  className,
  size = 480,
  color = 'hsl(var(--primary) / 0.12)',
}: SpotlightProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const bg = useMotionTemplate`radial-gradient(${size}px circle at ${x}px ${y}px, ${color}, transparent 70%)`;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set(e.clientX - r.left);
    y.set(e.clientY - r.top);
  };
  const reset = () => {
    x.set(-9999);
    y.set(-9999);
  };

  return (
    <div
      ref={ref}
      className={className}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ position: 'relative' }}
    >
      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{ background: bg }}
        />
      )}
      {children}
    </div>
  );
}
