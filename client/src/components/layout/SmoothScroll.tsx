import { useEffect, useRef, type ReactNode } from 'react';
import Lenis from 'lenis';
import { setLenis } from '@/lib/smoothScroll';

// Disabled under reduced-motion; the single Lenis instance is published via @/lib/smoothScroll so scrollToId can reach it outside React.
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
