import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';

interface BeamsProps {
  className?: string;
}

// Diagonal light-beam sweeps, GPU-only (transform/opacity), pointer-transparent, hidden under reduced-motion.
export default function Beams({ className }: BeamsProps) {
  const reduce = useReducedMotion();
  if (reduce) return null;

  const beams = [
    { c: 'via-neon/15', s: 'left-[12%] w-40', delay: 0, dur: 14 },
    { c: 'via-neon-violet/15', s: 'left-[48%] w-56', delay: 4, dur: 18 },
    { c: 'via-neon-blue/10', s: 'left-[78%] w-44', delay: 8, dur: 16 },
  ];

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className
      )}
    >
      {beams.map((b, i) => (
        <motion.div
          key={i}
          className={cn(
            'absolute -top-1/4 h-[150%] -rotate-12 bg-gradient-to-b from-transparent to-transparent blur-2xl',
            b.c,
            b.s
          )}
          animate={{ x: ['-12%', '14%', '-12%'], opacity: [0.3, 0.65, 0.3] }}
          transition={{
            duration: b.dur,
            delay: b.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
