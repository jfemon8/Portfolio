import type Lenis from 'lenis';

/**
 * Module-singleton bridge to the Lenis instance owned by <SmoothScroll/>.
 * Kept out of the component file so that file only exports a component
 * (Fast-Refresh / project rule #8).
 */
let lenis: Lenis | null = null;

export const setLenis = (instance: Lenis | null): void => {
  lenis = instance;
};

/** Smoothly scroll to an element id (used by the floating dock). */
export function scrollToId(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -8 });
  else el.scrollIntoView({ behavior: 'smooth' });
}
