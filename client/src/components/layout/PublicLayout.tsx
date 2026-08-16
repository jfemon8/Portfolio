import { useEffect } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
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
import {
  scrollToId,
  resetScroll,
  scrollToY,
  waitForElementId,
} from '@/lib/smoothScroll';
import { saveScroll, getScroll } from '@/lib/scrollMemory';
import { queryClient } from '@/lib/queryClient';
import { prefetchPublicRoutes } from '@/lib/prefetch';

/** Sole authority that initialises the canonical theme engine for the public site. */
export default function PublicLayout() {
  const { pathname, hash, state } = useLocation();
  const navigationType = useNavigationType();
  const instant = (state as { instant?: boolean } | null)?.instant === true;

  useEffect(() => initThemeSync(), []);

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, []);

  useEffect(() => prefetchPublicRoutes(), []);

  // Continuously remembers this route's scroll offset (rAF-throttled) so a back/forward nav back to it can restore where the visitor left off.
  useEffect(() => {
    let raf = 0;
    const onScroll = (): void => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => saveScroll(pathname, window.scrollY));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  // Waits for the `/#section` target to mount, lands on it, then keeps re-snapping while sections above are still fetching and reflowing taller.
  useEffect(() => {
    if (!hash) {
      const saved = navigationType === 'POP' ? getScroll(pathname) : undefined;
      if (saved == null) {
        resetScroll();
        return;
      }
      // One frame to let the route's content commit, then a short follow-up in case images/fonts are still reflowing the page.
      const raf = requestAnimationFrame(() => scrollToY(saved));
      const settle = setTimeout(() => scrollToY(saved), 150);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(settle);
      };
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
  }, [pathname, hash, instant, navigationType]);

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
            className="flex-1 pb-8 outline-none"
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
