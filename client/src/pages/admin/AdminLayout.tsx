import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
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
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Seo from '@/components/ui/Seo';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const nav: NavItem[] = [
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
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = (): void => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-bg">
      <Seo title="Admin" />

      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/admin" className="font-mono font-bold gradient-text">
          emon_admin
        </Link>
        <button
          onClick={() => setOpen((o) => !o)}
          className="p-1.5 text-ink-soft"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <div className="flex">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-line bg-bg-soft transition-transform lg:static lg:translate-x-0 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col p-4">
            <Link
              to="/admin"
              className="mb-6 hidden items-center gap-2 px-2 py-2 font-mono text-lg font-bold lg:flex"
            >
              <span className="gradient-text">emon</span>
              <span className="text-ink-dim">/admin</span>
            </Link>

            <nav className="flex-1 space-y-1 overflow-y-auto">
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-neon/10 text-neon'
                        : 'text-ink-soft hover:bg-bg-elevated hover:text-ink'
                    }`
                  }
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </NavLink>
              ))}
            </nav>

            <div className="mt-4 border-t border-line pt-4">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-bg-elevated hover:text-neon"
              >
                <ExternalLink className="h-4 w-4" /> View site
              </a>
              <div className="flex items-center gap-3 rounded-xl bg-bg-card px-3 py-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-neon/15 text-xs font-bold text-neon">
                  {user?.name?.[0] || 'A'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink">
                    {user?.name}
                  </p>
                  <p className="truncate text-[11px] text-ink-dim">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={doLogout}
                  title="Log out"
                  className="text-ink-dim hover:text-neon-pink"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {open && (
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          />
        )}

        <main className="min-h-screen flex-1 p-5 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
