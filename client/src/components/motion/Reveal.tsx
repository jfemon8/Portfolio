import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import { type ReactNode } from 'react';
import { duration, ease, reveal, viewportOnce } from '@/config/animation';
import { useSkipEntranceIfVisible } from '@/hooks/useSkipEntranceIfVisible';

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

/** Scroll-triggered reveal. Skips the animation for content already in the viewport at mount (i.e. just-loaded, not scrolled-to) — only genuine scroll-ins animate. */
export default function Reveal({
  children,
  delay = 0,
  direction = 'up',
  distance = 'md',
  ...rest
}: RevealProps) {
  const reduce = useReducedMotion();
  const { ref, skip: alreadyVisible } =
    useSkipEntranceIfVisible<HTMLDivElement>();
  const skip = reduce || alreadyVisible;
  const from = skip ? {} : offset(direction, reveal[distance]);

  return (
    <motion.div
      initial={skip ? false : { opacity: 0, ...from }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: duration.slow, ease: ease.out, delay }}
      {...rest}
      ref={ref}
    >
      {children}
    </motion.div>
  );
}
