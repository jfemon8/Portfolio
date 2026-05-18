import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { type ReactNode } from 'react';
import { ease } from '@/config/animation';

/**
 * Cinematic route transition. Keyed by pathname so each page fades/slides
 * in/out. Reduced-motion → instant. Reusable shell wrapper (rule #3).
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: -12 }}
        transition={{ duration: 0.45, ease: ease.inOut }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
