import { motion, useScroll, useSpring } from 'motion/react';
import { spring } from '@/config/animation';

/**
 * Top scroll-progress bar (page reading progress). GPU-only scaleX,
 * spring-smoothed. A premium signature detail.
 */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, spring.gentle);

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[55] h-0.5 origin-left bg-neon-gradient"
    />
  );
}
