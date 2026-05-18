import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Footer from './Footer';
import PremiumBackground from './PremiumBackground';
import FloatingDock from './FloatingDock';
import ScrollProgress from './ScrollProgress';
import PageTransition from './PageTransition';
import SmoothScroll from './SmoothScroll';
import { track } from '@/lib/api';
import { initThemeSync } from '@/stores/theme';

/**
 * Premium public shell (P2): Lenis smooth-scroll · cinematic backdrop ·
 * scroll-progress · floating magnetic dock · animated route transitions.
 * The canonical theme engine is now the sole authority here.
 */
export default function PublicLayout() {
  const { pathname, hash } = useLocation();

  useEffect(() => initThemeSync(), []);

  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);

  useEffect(() => {
    track('pageview', pathname);
  }, [pathname]);

  return (
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
  );
}
