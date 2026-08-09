import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Footer from './Footer';
import PremiumBackground from './PremiumBackground';
import FloatingDock from './FloatingDock';
import ScrollProgress from './ScrollProgress';
import PageTransition from './PageTransition';
import SmoothScroll from './SmoothScroll';
import { ConfirmProvider } from '@/components/admin/ConfirmModal';
import { track } from '@/lib/api';
import { useScrollDepth } from '@/hooks/useScrollDepth';
import { initThemeSync } from '@/stores/theme';
import { scrollToId, resetScroll, waitForElementId } from '@/lib/smoothScroll';
import { queryClient } from '@/lib/queryClient';
import { prefetchPublicRoutes } from '@/lib/prefetch';

/** Sole authority that initialises the canonical theme engine for the public site. */
export default function PublicLayout() {
  const { pathname, hash, state } = useLocation();
  const instant = (state as { instant?: boolean } | null)?.instant === true;

  useEffect(() => initThemeSync(), []);

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, []);

  useEffect(() => prefetchPublicRoutes(), []);

  // Waits for the `/#section` target to mount, lands on it, then keeps re-snapping while sections above are still fetching and reflowing taller.
  useEffect(() => {
    if (!hash) {
      resetScroll();
      return;
    }
    const id = hash.slice(1);
    let cancelled = false;
    let startTimer: ReturnType<typeof setTimeout>;
    let rafId: number;

    const abortChase = (): void => {
      cancelled = true;
    };

    void waitForElementId(id).then((el) => {
      if (cancelled || !el) return;
      scrollToId(id, instant);
      window.addEventListener('wheel', abortChase, {
        passive: true,
        once: true,
      });
      window.addEventListener('touchstart', abortChase, {
        passive: true,
        once: true,
      });

      // Lets the eased scroll finish, then chases: re-snaps whenever the target moves (siblings still fetching reflow the page) until queries settle and it holds still.
      startTimer = setTimeout(
        () => {
          if (cancelled) return;
          const deadline = performance.now() + 2000;
          let prevTop = el.getBoundingClientRect().top;
          let stableFrames = 0;
          const chase = (): void => {
            if (cancelled) return;
            const top = el.getBoundingClientRect().top;
            const stillFetching = queryClient.isFetching() > 0;
            if (Math.abs(top - prevTop) > 0.5) {
              scrollToId(id, true);
              stableFrames = 0;
              prevTop = el.getBoundingClientRect().top;
            } else {
              prevTop = top;
              if (!stillFetching) stableFrames++;
            }
            if (
              (stillFetching || stableFrames < 10) &&
              performance.now() < deadline
            ) {
              rafId = requestAnimationFrame(chase);
            }
          };
          rafId = requestAnimationFrame(chase);
        },
        instant ? 50 : 500
      );
    });

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      cancelAnimationFrame(rafId);
      window.removeEventListener('wheel', abortChase);
      window.removeEventListener('touchstart', abortChase);
    };
  }, [pathname, hash, instant]);

  useEffect(() => {
    track('pageview', pathname);
  }, [pathname]);

  useScrollDepth(pathname);

  return (
    <ConfirmProvider>
      <SmoothScroll>
        <div className="relative flex min-h-screen flex-col">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:border focus:border-border focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-glow"
          >
            Skip to content
          </a>
          <PremiumBackground />
          <ScrollProgress />
          <FloatingDock />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 pb-28 outline-none"
          >
            <PageTransition>
              <Outlet />
            </PageTransition>
          </main>
          <Footer />
        </div>
      </SmoothScroll>
    </ConfirmProvider>
  );
}
