import { useEffect, useRef } from 'react';
import { track } from '@/lib/api';

const THRESHOLDS = [25, 50, 75, 100] as const;

// Fires a one-shot scroll_depth beacon at the 25/50/75/100% marks via a passive + rAF-throttled listener; buckets reset per path for SPA navigation.
export function useScrollDepth(path: string): void {
  const sent = useRef<Set<number>>(new Set());

  useEffect(() => {
    sent.current = new Set();
    let raf = 0;

    const measure = (): void => {
      raf = 0;
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) return; // not scrollable — nothing to measure
      // +2px tolerance so the true bottom reliably reads as 100 (subpixel/smooth-scroll can leave scrollY a fraction short of `max`).
      const pct = Math.min(100, ((window.scrollY + 2) / max) * 100);
      for (const t of THRESHOLDS) {
        if (pct >= t && !sent.current.has(t)) {
          sent.current.add(t);
          track('scroll_depth', path, undefined, t);
        }
      }
    };

    const onScroll = (): void => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    measure();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [path]);
}
