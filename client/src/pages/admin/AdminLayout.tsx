import { useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  User,
  Briefcase,
  FolderGit2,
  Wrench,
  GraduationCap,
  Award,
  Newspaper,
  Inbox,
  BarChart3,
  Users,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Command,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUIStore } from '@/stores/ui';
import { initThemeSync } from '@/stores/theme';
import ThemeToggle from '@/components/ui/ThemeToggle';
import CommandPalette, {
  type CommandItem,
} from '@/components/admin/CommandPalette';
import Seo from '@/components/ui/Seo';
import { cn } from '@/lib/cn';
import type { UserRole } from '@/types';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** when set, only these roles see the item (RBAC-ready for P4.3) */
  roles?: UserRole[];
}

const NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/profile', label: 'Profile', icon: User },
  { to: '/admin/experience', label: 'Experience', icon: Briefcase },
  { to: '/admin/projects', label: 'Projects', icon: FolderGit2 },
  { to: '/admin/skills', label: 'Skills', icon: Wrench },
  { to: '/admin/education', label: 'Education', icon: GraduationCap },
  { to: '/admin/credentials', label: 'Credentials', icon: Award },
  { to: '/admin/blog', label: 'Blog', icon: Newspaper },
  { to: '/admin/messages', label: 'Messages', icon: Inbox },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  {
    to: '/admin/users',
    label: 'Users & Roles',
    icon: Users,
    roles: ['superAdmin'],
  },
  {
    to: '/admin/audit',
    label: 'Audit log',
    icon: ScrollText,
    roles: ['superAdmin'],
  },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const mobileOpen = useUIStore((s) => s.mobileNavOpen);
  const setMobileOpen = useUIStore((s) => s.setMobileNavOpen);
  const toggleCommand = useUIStore((s) => s.toggleCommand);

  useEffect(() => initThemeSync(), []);

  // Global ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommand();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleCommand]);

  const visibleNav = NAV.filter(
    (n) => !n.roles || (user && n.roles.includes(user.role))
  );

  const commandItems: CommandItem[] = [
    ...visibleNav.map((n) => ({ label: n.label, to: n.to, group: 'Go to' })),
    { label: 'New blog post', to: '/admin/blog/new', group: 'Create' },
    { label: 'View live site', to: '/', group: 'Links' },
  ];

  const doLogout = (): void => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo title="Admin" noindex />
      <CommandPalette items={commandItems} />

      {/* Topbar */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-muted-foreground lg:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
        <Link to="/admin" className="font-mono text-lg font-bold gradient-text">
          emon<span className="text-muted-foreground/60">/admin</span>
        </Link>

        <button
          onClick={toggleCommand}
          className="ml-auto flex items-center gap-2 rounded-xl border border-border/70 bg-card/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Command className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search…</span>
          <kbd className="hidden rounded border border-border/60 px-1.5 font-mono text-[10px] sm:inline">
            ⌘K
          </kbd>
        </button>
        <ThemeToggle />
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="hidden rounded-xl border border-border/70 bg-card/50 p-2 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary sm:block"
          title="View site"
        >
          <ExternalLink className="h-5 w-5" />
        </a>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 top-16 z-40 w-64 transform border-r border-border/70 bg-card/40 backdrop-blur-xl transition-transform lg:static lg:top-0 lg:translate-x-0',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-[calc(100vh-4rem)] flex-col p-4 lg:h-screen">
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {visibleNav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground hover:bg-card hover:text-foreground'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="admin-nav-active"
                          className="absolute inset-0 rounded-xl border border-primary/30 bg-primary/10"
                          transition={{
                            type: 'spring',
                            stiffness: 320,
                            damping: 28,
                          }}
                        />
                      )}
                      <n.icon className="relative h-4 w-4" />
                      <span className="relative">{n.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="mt-4 flex items-center gap-3 rounded-xl border border-border/70 bg-card/60 px-3 py-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-xs font-bold text-neon">
                {user?.name?.[0] || 'A'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">
                  {user?.name}
                </p>
                <p className="truncate text-[11px] capitalize text-muted-foreground/70">
                  {user?.role}
                </p>
              </div>
              <button
                onClick={doLogout}
                title="Log out"
                className="text-muted-foreground/70 transition-colors hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 top-16 z-30 bg-black/60 lg:hidden"
          />
        )}

        <main className="min-h-[calc(100vh-4rem)] flex-1 p-5 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
