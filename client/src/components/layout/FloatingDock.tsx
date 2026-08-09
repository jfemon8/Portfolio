import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Home,
  User,
  Sparkles,
  Briefcase,
  FolderGit2,
  Newspaper,
  Mail,
  type LucideIcon,
} from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { scrollToId } from '@/lib/smoothScroll';
import { prefetchRoute } from '@/lib/prefetch';
import { cn } from '@/lib/cn';
import { useSiteCopy } from '@/hooks/useSiteCopy';

interface DockItem {
  label: string;
  icon: LucideIcon;
  /** '#id' = home section · '/path' = route */
  target: string;
}

const ITEMS: DockItem[] = [
  { label: 'Home', icon: Home, target: '#hero' },
  { label: 'About', icon: User, target: '#about' },
  { label: 'Skills', icon: Sparkles, target: '#skills' },
  { label: 'Work', icon: Briefcase, target: '#experience' },
  { label: 'Projects', icon: FolderGit2, target: '/projects' },
  { label: 'Blog', icon: Newspaper, target: '/blog' },
  { label: 'Contact', icon: Mail, target: '#contact' },
];

const SECTION_IDS = ITEMS.filter((i) => i.target.startsWith('#')).map((i) =>
  i.target.slice(1)
);

export default function FloatingDock() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('hero');
  const nav = useSiteCopy('nav', {
    items: [] as { key: string; label: string }[],
  });

  // rAF-throttled scroll listener — IntersectionObserver missed late-mounting sections.
  useEffect(() => {
    if (pathname !== '/') {
      // Drop stale activeSection so the next visit to Home starts fresh.
      setActiveSection('hero');
      return;
    }
    let raf = 0;
    const update = (): void => {
      raf = 0;
      // A section becomes active once its top crosses ~30% down the viewport.
      const anchor = window.innerHeight * 0.3;
      let current = SECTION_IDS[0] ?? 'hero';
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - anchor <= 0) current = id;
      }
      setActiveSection(current);
    };
    const schedule = (): void => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  const go = (target: string): void => {
    if (target.startsWith('#')) {
      const id = target.slice(1);
      if (pathname !== '/') {
        // instant: skip the smooth-scroll-through, land directly on the target.
        navigate(id === 'hero' ? '/' : `/${target}`, {
          state: { instant: true },
        });
      } else {
        scrollToId(id);
      }
    } else {
      navigate(target);
    }
  };

  const isActive = (target: string) =>
    target.startsWith('#')
      ? pathname === '/' && activeSection === target.slice(1)
      : pathname.startsWith(target);

  return (
    <motion.nav
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      // Adds the safe-area inset so the dock clears the home-indicator on notched phones.
      className="fixed inset-x-0 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4"
    >
      <div className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-card/80 p-1.5 backdrop-blur-xl shadow-[0_1.5rem_4.375rem_-1.5625rem_hsl(var(--shadow-color)/var(--shadow-strength))] sm:p-2">
        {ITEMS.map((item) => {
          const active = isActive(item.target);
          const label =
            nav.items.find((n) => n.key === item.target)?.label || item.label;
          return (
            <button
              key={item.label}
              onClick={() => go(item.target)}
              onPointerEnter={() => {
                if (item.target.startsWith('/')) prefetchRoute(item.target);
              }}
              onFocus={() => {
                if (item.target.startsWith('/')) prefetchRoute(item.target);
              }}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              title={label}
              className={cn(
                'group relative flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-2.5 py-2 text-sm transition-colors sm:min-h-9 sm:min-w-0 sm:px-3',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {active && (
                <motion.span
                  layoutId="dock-active"
                  className="absolute inset-0 rounded-xl bg-primary/15 ring-1 ring-primary/40"
                  transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                />
              )}
              <item.icon className="relative h-4 w-4 shrink-0" />
              <span className="relative hidden md:inline">{label}</span>
            </button>
          );
        })}
        <span className="mx-1 h-6 w-px shrink-0 bg-border/70" />
        <ThemeToggle className="h-11 w-11 shrink-0 border-0 bg-transparent sm:h-9 sm:w-9" />
      </div>
    </motion.nav>
  );
}
