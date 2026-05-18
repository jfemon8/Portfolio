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
import Magnetic from '@/components/motion/Magnetic';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { scrollToId } from '@/lib/smoothScroll';
import { prefetchRoute } from '@/lib/prefetch';
import { cn } from '@/lib/cn';

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

  // Lightweight scroll-spy for the home anchor sections.
  useEffect(() => {
    if (pathname !== '/') return;
    const els = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (e): e is HTMLElement => !!e
    );
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [pathname]);

  const go = (target: string) => {
    if (target.startsWith('#')) {
      const id = target.slice(1);
      if (pathname !== '/') {
        navigate('/');
        setTimeout(() => scrollToId(id), 120);
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
      className="fixed inset-x-0 bottom-5 z-50 flex justify-center px-4"
    >
      <div className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-card/70 p-2 backdrop-blur-xl shadow-[0_20px_60px_-25px_rgba(0,0,0,0.8)]">
        {ITEMS.map((item) => {
          const active = isActive(item.target);
          return (
            <Magnetic key={item.label} strength={0.25}>
              <button
                onClick={() => go(item.target)}
                onPointerEnter={() => {
                  if (item.target.startsWith('/')) prefetchRoute(item.target);
                }}
                onFocus={() => {
                  if (item.target.startsWith('/')) prefetchRoute(item.target);
                }}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="dock-active"
                    className="absolute inset-0 rounded-xl bg-primary/10 ring-1 ring-primary/30"
                    transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                  />
                )}
                <item.icon className="relative h-4 w-4 shrink-0" />
                <span className="relative hidden md:inline">{item.label}</span>
              </button>
            </Magnetic>
          );
        })}
        <span className="mx-1 h-6 w-px shrink-0 bg-border/70" />
        <ThemeToggle className="h-9 w-9 shrink-0 border-0 bg-transparent" />
      </div>
    </motion.nav>
  );
}
