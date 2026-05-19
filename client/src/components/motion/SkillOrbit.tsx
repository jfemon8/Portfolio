import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';

interface SkillOrbitProps {
  /** Skill names to place on the rings. */
  skills: string[];
  className?: string;
}

/**
 * Decorative orbiting skill rings (project rule #3). Concentric rings rotate
 * slowly; each chip counter-rotates to stay upright. Motion.dev only;
 * static (no spin) under reduced-motion. aria-hidden — the interactive
 * category cloud beside it is the accessible source of truth.
 */
export default function SkillOrbit({ skills, className }: SkillOrbitProps) {
  const reduce = useReducedMotion();
  if (skills.length === 0) return null;

  const half = Math.ceil(skills.length / 2);
  const rings = [
    { items: skills.slice(0, half), r: 40, dur: 38, dir: 1 },
    { items: skills.slice(half, 12), r: 25, dur: 30, dir: -1 },
  ].filter((rg) => rg.items.length > 0);

  return (
    <div
      aria-hidden
      className={cn(
        'relative mx-auto aspect-square w-full max-w-md',
        className
      )}
    >
      <div className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-primary/30 bg-primary/10 text-center font-mono text-[11px] font-semibold leading-tight text-neon shadow-glow">
        my
        <br />
        stack
      </div>

      {rings.map((rg, ri) => (
        <motion.div
          key={ri}
          className="absolute inset-0"
          animate={reduce ? undefined : { rotate: rg.dir * 360 }}
          transition={{ duration: rg.dur, repeat: Infinity, ease: 'linear' }}
        >
          {rg.items.map((name, i) => {
            const angle = (i / rg.items.length) * 2 * Math.PI;
            const x = 50 + rg.r * Math.cos(angle);
            const y = 50 + rg.r * Math.sin(angle);
            return (
              <motion.span
                key={name}
                className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
                style={{ left: `${x}%`, top: `${y}%` }}
                animate={reduce ? undefined : { rotate: rg.dir * -360 }}
                transition={{
                  duration: rg.dur,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >
                {name}
              </motion.span>
            );
          })}
        </motion.div>
      ))}
    </div>
  );
}
