import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon, Terminal } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface NavLink {
  label: string;
  to: string;
}

const links: NavLink[] = [
  { label: 'Home', to: '/#home' },
  { label: 'About', to: '/#about' },
  { label: 'Skills', to: '/#skills' },
  { label: 'Projects', to: '/projects' },
  { label: 'Experience', to: '/#experience' },
  { label: 'Blog', to: '/blog' },
  { label: 'Contact', to: '/#contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isDark, toggle } = useTheme();
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname, hash]);

  const go = (to: string): void => {
    setOpen(false);
    if (to.startsWith('/#')) {
      const selector = to.slice(1);
      if (pathname !== '/') {
        navigate('/');
        setTimeout(
          () =>
            document
              .querySelector(selector)
              ?.scrollIntoView({ behavior: 'smooth' }),
          120
        );
      } else {
        document
          .querySelector(selector)
          ?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(to);
    }
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-line bg-bg/80 backdrop-blur-xl'
          : 'border-b border-transparent'
      }`}
    >
      <nav className="container-x flex h-16 items-center justify-between">
        <button
          onClick={() => go('/#home')}
          className="flex items-center gap-2 font-mono text-lg font-bold"
        >
          <Terminal className="h-5 w-5 text-neon" />
          <span className="gradient-text">emon</span>
          <span className="animate-blink text-neon">_</span>
        </button>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.to}>
              <button
                onClick={() => go(l.to)}
                className="rounded-lg px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-bg-elevated hover:text-neon"
              >
                {l.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-bg-elevated hover:text-neon"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            onClick={() => go('/#contact')}
            className="btn-primary hidden sm:inline-flex"
          >
            Hire me
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg p-2 text-ink-soft md:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-line bg-bg/95 backdrop-blur-xl md:hidden">
          <ul className="container-x flex flex-col py-3">
            {links.map((l) => (
              <li key={l.to}>
                <button
                  onClick={() => go(l.to)}
                  className="w-full rounded-lg px-3 py-3 text-left text-ink-soft hover:bg-bg-elevated hover:text-neon"
                >
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
