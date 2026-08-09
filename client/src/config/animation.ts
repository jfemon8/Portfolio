// Single source of truth for motion tokens shared by Motion.dev and React Spring, so transitions feel like one physics system.
import type { Transition, Variants } from 'motion/react';

/** Signature easings (cubic-bezier) — premium, natural, never linear. */
export const ease = {
  /** smooth deceleration — default for reveals */
  out: [0.22, 1, 0.36, 1],
  /** expressive in-out — section/page transitions */
  inOut: [0.83, 0, 0.17, 1],
  /** snappy — hover/press micro-interactions */
  snappy: [0.34, 1.56, 0.64, 1],
} as const;

export const duration = {
  fast: 0.18,
  base: 0.4,
  slow: 0.6,
  slower: 0.9,
} as const;

/** Motion.dev spring presets (UI motion). */
export const spring = {
  soft: { type: 'spring', stiffness: 120, damping: 20, mass: 0.6 },
  snappy: { type: 'spring', stiffness: 320, damping: 24 },
  gentle: { type: 'spring', stiffness: 90, damping: 18 },
} satisfies Record<string, Transition>;

/** React Spring physics configs (floating / elastic / magnetic). */
export const physics = {
  float: { tension: 90, friction: 14 },
  magnetic: { tension: 350, friction: 22 },
  elastic: { tension: 280, friction: 12 },
} as const;

/** Scroll-reveal distance (px) by intent. */
export const reveal = {
  sm: 16,
  md: 28,
  lg: 48,
} as const;

/** Reusable Motion variant: staggered children container. */
export const staggerContainer = (
  stagger = 0.08,
  delayChildren = 0
): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

/** Reusable Motion variant: fade-up item (pairs with staggerContainer). */
export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: reveal.md },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: ease.out },
  },
};

export const viewportOnce = { once: true, margin: '-80px' } as const;
