import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';

interface GradientMeshProps {
  className?: string;
}

// GPU-only animation (transform/opacity), reduced-motion safe.
export default function GradientMesh({ className }: GradientMeshProps) {
  const reduce = useReducedMotion();

  const blobs = [
    { c: 'bg-neon/20', s: 'h-[42rem] w-[42rem] -left-40 -top-40', d: 0 },
    {
      c: 'bg-neon-violet/20',
      s: 'h-[38rem] w-[38rem] right-[-12rem] top-[10%]',
      d: 6,
    },
    {
      c: 'bg-neon-blue/15',
      s: 'h-[34rem] w-[34rem] left-[20%] bottom-[-14rem]',
      d: 12,
    },
  ];

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className
      )}
    >
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className={cn('absolute rounded-full blur-[5.625rem]', b.c, b.s)}
          animate={
            reduce
              ? undefined
              : {
                  x: [0, 40, -30, 0],
                  y: [0, -30, 25, 0],
                  scale: [1, 1.12, 0.95, 1],
                }
          }
          transition={{
            duration: 22 + i * 6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: b.d,
          }}
        />
      ))}
    </div>
  );
}
