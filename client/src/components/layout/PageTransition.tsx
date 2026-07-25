import { useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Suspense, type ReactNode } from 'react';
import { ease, duration } from '@/config/animation';
import { Spinner } from '@/components/ui/States';

/**
 * Route enter-transition. The `motion.div` is keyed by pathname, so every
 * navigation remounts it and replays the fade/slide-in from `initial`.
 *
 * We intentionally do NOT use `AnimatePresence` / `mode="wait"` here: combined
 * with React Router's `<Outlet>` (which always renders the *current* route)
 * and lazy pages, the exit→enter hand-off could strand the entering page at
 * `opacity: 0` — a blank page that only appeared after a full reload. A keyed
 * enter-only animation always fires on mount, so it can't get stuck. The inner
 * `Suspense` keeps a code-split chunk's fallback inside the animated element.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.base, ease: ease.out }}
    >
      <Suspense
        fallback={
          <div className="grid min-h-[60vh] place-items-center">
            <Spinner />
          </div>
        }
      >
        {children}
      </Suspense>
    </motion.div>
  );
}
