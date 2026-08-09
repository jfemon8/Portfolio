import { motion, useScroll, useSpring } from 'motion/react';
import { spring } from '@/config/animation';

// GPU-only scaleX (not width) for a spring-smoothed scroll-progress bar.
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
