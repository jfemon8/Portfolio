import { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { IconType } from 'react-icons';
import {
  SiReact,
  SiNodedotjs,
  SiTypescript,
  SiTailwindcss,
  SiMongodb,
  SiExpress,
  SiNextdotjs,
  SiGit,
} from 'react-icons/si';
import { cn } from '@/lib/cn';

const ICONS: IconType[] = [
  SiReact,
  SiNodedotjs,
  SiTypescript,
  SiTailwindcss,
  SiMongodb,
  SiExpress,
  SiNextdotjs,
  SiGit,
];

interface FloatingTechIconsProps {
  className?: string;
}

// Deterministic layout avoids hydration shift; GPU-only float, pointer/screen-reader transparent, hidden under reduced-motion, muted token adapts to every theme.
export default function FloatingTechIcons({
  className,
}: FloatingTechIconsProps) {
  const reduce = useReducedMotion();

  const items = useMemo(
    () =>
      ICONS.map((Icon, idx) => ({
        Icon,
        left: 8 + ((idx * 12.5 + (idx % 2 ? 6 : 0)) % 84),
        top: 10 + ((idx * 17) % 76),
        size: 22 + (idx % 3) * 10,
        dur: 9 + (idx % 4) * 3,
        delay: idx * 0.7,
      })),
    []
  );

  if (reduce) return null;

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className
      )}
    >
      {items.map(({ Icon, left, top, size, dur, delay }, i) => (
        <motion.span
          key={i}
          className="absolute text-muted-foreground/[0.07]"
          style={{ left: `${left}%`, top: `${top}%` }}
          animate={{ y: [0, -18, 0], rotate: [0, 6, -6, 0] }}
          transition={{
            duration: dur,
            delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Icon size={size} />
        </motion.span>
      ))}
    </div>
  );
}
