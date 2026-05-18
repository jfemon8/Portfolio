import { useEffect, useRef, type ReactNode } from 'react';
import Lenis from 'lenis';
import { setLenis } from '@/lib/smoothScroll';

/**
 * Lenis smooth-scroll provider. Disabled under reduced-motion (native
 * scrolling preserved). Single instance, cleaned up on unmount.
 * The instance is published via `@/lib/smoothScroll` for `scrollToId`.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  const rafRef = useRef<number>();

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReduced) return;

    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    setLenis(lenis);

    const raf = (time: number) => {
      lenis.raf(time);
      rafRef.current = requestAnimationFrame(raf);
    };
    rafRef.current = requestAnimationFrame(raf);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  return <>{children}</>;
}
