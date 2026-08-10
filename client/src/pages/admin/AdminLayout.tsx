import { useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  User,
  Briefcase,
  FolderGit2,
  Wrench,
  Blocks,
  GraduationCap,
  Award,
  Newspaper,
  Inbox,
  Images,
  BarChart3,
  Users,
  ScrollText,
  Settings,
  Type,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Command,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/usePortfolio';
import { useUIStore } from '@/stores/ui';
import { initThemeSync } from '@/stores/theme';
import { prefetchAdminRoutes } from '@/lib/prefetch';
import ThemeToggle from '@/components/ui/ThemeToggle';
import CommandPalette, {
  type CommandItem,
} from '@/components/admin/CommandPalette';
import { ConfirmProvider } from '@/components/admin/ConfirmModal';
import Seo from '@/components/ui/Seo';
import { cn } from '@/lib/cn';
import type { UserRole } from '@/types';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** when set, only these roles see the item (RBAC). */
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
  { to: '/admin/tools', label: 'Tools', icon: Blocks },
  { to: '/admin/media', label: 'Media', icon: Images },
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
  { to: '/admin/site-copy', label: 'Site copy', icon: Type },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

// Header/sidebar use position: fixed with their own scroll regions so the chrome stays on screen while main scrolls; solid bg-card avoids a washy blur in either theme.
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { data: profileData } = useProfile();
  const avatarUrl = profileData?.data?.avatar;
  const navigate = useNavigate();
  const mobileOpen = useUIStore((s) => s.mobileNavOpen);
  const setMobileOpen = useUIStore((s) => s.setMobileNavOpen);
  const toggleCommand = useUIStore((s) => s.toggleCommand);

  useEffect(() => initThemeSync(), []);
  useEffect(() => prefetchAdminRoutes(), []);

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

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

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
    <ConfirmProvider>
      <div className="min-h-screen bg-background text-foreground">
        <Seo title="Admin" noindex />
        <CommandPalette items={commandItems} />

        {/* Solid bg-card keeps the header an opaque strip in both light and dark mode, not a see-through wash. */}
        <header className="sticky top-0 z-50 flex h-16 items-center gap-3 border-b border-border bg-card px-4">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="-ml-1 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
          <Link
            to="/admin"
            className="font-mono text-lg font-bold gradient-text"
          >
            emon<span className="text-muted-foreground/60">/admin</span>
          </Link>

          {/* Icons share a uniform h-10 w-10 footprint on mobile so they read as one row; Search only expands to a labelled chip at sm+ where there's room. */}
          <button
            onClick={toggleCommand}
            aria-label="Search"
            title="Search"
            className="ml-auto inline-flex h-10 w-10 items-center justify-center gap-2 rounded-xl border border-border bg-muted/50 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground sm:h-10 sm:w-auto sm:px-3 sm:text-sm"
          >
            <Command className="h-5 w-5 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Search…</span>
            <kbd className="hidden rounded border border-border px-1.5 font-mono text-3xs sm:inline">
              ⌘K
            </kbd>
          </button>
          <ThemeToggle />
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/50 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            title="View live site"
            aria-label="View live site"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
        </header>

        {/* position: fixed at all breakpoints; bottom-0/top-16 spans below the header so the inner flex column can host a scrollable nav + pinned footer. */}
        <aside
          className={cn(
            'fixed bottom-0 left-0 top-16 z-40 w-64 transform border-r border-border bg-card transition-transform duration-200 ease-out lg:translate-x-0',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-full flex-col">
            {/* Only this region scrolls when the nav list outgrows the viewport — the profile card below stays put. */}
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {visibleNav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
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
                      <n.icon className="relative h-4 w-4 shrink-0" />
                      <span className="relative truncate">{n.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Outside the scroll area so it stays visible regardless of nav list length. */}
            <div className="shrink-0 border-t border-border p-3">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user?.name || 'Avatar'}
                    className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
                  />
                ) : (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold uppercase text-neon">
                    {user?.name?.[0] || 'A'}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {user?.name}
                  </p>
                  <p className="truncate text-2xs capitalize text-muted-foreground/80">
                    {user?.role}
                  </p>
                </div>
                <button
                  onClick={doLogout}
                  title="Log out"
                  aria-label="Log out"
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Only covers below the header so the topbar (and its close X) stays interactable. */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-x-0 bottom-0 top-16 z-30 bg-black/60 lg:hidden"
          />
        )}

        {/* ml-64 matches the sidebar's width on lg+; on mobile the sidebar overlays instead, so main stays full width. */}
        <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:ml-64 lg:p-8">
          <div className="mx-auto w-full max-w-screen-2xl">
            <Outlet />
          </div>
        </main>
      </div>
    </ConfirmProvider>
  );
}
