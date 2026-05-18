import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import { type ReactNode } from 'react';
import { duration, ease, reveal, viewportOnce } from '@/config/animation';

type Direction = 'up' | 'down' | 'left' | 'right';

interface RevealProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  delay?: number;
  direction?: Direction;
  distance?: keyof typeof reveal;
}

const offset = (dir: Direction, d: number) => {
  switch (dir) {
    case 'up':
      return { y: d };
    case 'down':
      return { y: -d };
    case 'left':
      return { x: d };
    case 'right':
      return { x: -d };
  }
};

/**
 * Scroll-triggered reveal — the canonical entrance animation (project rule
 * #3). Token-driven and fully `prefers-reduced-motion` safe.
 */
export default function Reveal({
  children,
  delay = 0,
  direction = 'up',
  distance = 'md',
  ...rest
}: RevealProps) {
  const reduce = useReducedMotion();
  const from = reduce ? {} : offset(direction, reveal[distance]);

  return (
    <motion.div
      initial={{ opacity: 0, ...from }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: duration.slow, ease: ease.out, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
