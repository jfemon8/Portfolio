import type Lenis from 'lenis';

// Module-singleton bridge to the Lenis instance owned by <SmoothScroll/>; kept out of the component file so it only exports a component (Fast Refresh).
let lenis: Lenis | null = null;

export const setLenis = (instance: Lenis | null): void => {
  lenis = instance;
};

/** Scroll to an element id (used by the floating dock). `immediate` skips the ease, for a final corrective snap. */
export function scrollToId(id: string, immediate = false): void {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) {
    // Force a sync recalc — Lenis's own ResizeObserver update is async and would clamp a just-mounted taller page.
    lenis.resize();
    lenis.scrollTo(el, { offset: -8, immediate });
  } else {
    el.scrollIntoView({ behavior: immediate ? 'instant' : 'smooth' });
  }
}

/** Jump to top instantly — goes through Lenis so its internal state stays in sync. */
export function resetScroll(): void {
  if (lenis) lenis.scrollTo(0, { immediate: true });
  else window.scrollTo({ top: 0, behavior: 'instant' });
}

/** Resolves once an element with this id exists in the DOM, or null after `timeoutMs`. */
export function waitForElementId(
  id: string,
  timeoutMs = 8000
): Promise<HTMLElement | null> {
  const existing = document.getElementById(id);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    function cleanup(): void {
      observer.disconnect();
      clearTimeout(timer);
    }
    const observer = new MutationObserver(() => {
      const el = document.getElementById(id);
      if (el) {
        cleanup();
        resolve(el);
      }
    });
    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
