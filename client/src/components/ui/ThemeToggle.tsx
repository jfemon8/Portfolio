import { type MouseEvent as ReactMouseEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/stores/theme';
import { cn } from '@/lib/cn';

/**
 * Premium animated theme toggle — the single theme control (project rule
 * #3), driven by the canonical Zustand theme engine (P0). Replaces the
 * legacy useTheme hook in the new shell.
 */
export default function ThemeToggle({ className }: { className?: string }) {
  const resolved = useThemeStore((s) => s.resolved);
  const toggle = useThemeStore((s) => s.toggle);
  const reduce = useReducedMotion();
  const isDark = resolved === 'dark';

  /**
   * Premium animated theme switch via the View Transitions API — a circular
   * reveal from the click point. Graceful fallback (instant) when the API is
   * unsupported or the user prefers reduced motion.
   */
  const onToggle = (e: ReactMouseEvent): void => {
    const start = (
      document as unknown as {
        startViewTransition?: (cb: () => void) => unknown;
      }
    ).startViewTransition;
    if (reduce || typeof start !== 'function') {
      toggle();
      return;
    }
    const root = document.documentElement;
    root.style.setProperty('--vt-x', `${e.clientX}px`);
    root.style.setProperty('--vt-y', `${e.clientY}px`);
    start.call(document, () => toggle());
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      className={cn(
        'relative grid h-10 w-10 place-items-center rounded-xl border border-border/70',
        'bg-card/50 text-muted-foreground backdrop-blur transition-colors',
        'hover:border-primary/50 hover:text-primary',
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? 'moon' : 'sun'}
          initial={reduce ? false : { rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={reduce ? undefined : { rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="absolute"
        >
          {isDark ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
