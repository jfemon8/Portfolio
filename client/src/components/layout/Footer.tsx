import { Link } from 'react-router-dom';
import {
  Github,
  Linkedin,
  Mail,
  Code2,
  Heart,
  type LucideIcon,
} from 'lucide-react';
import { useProfile } from '@/hooks/usePortfolio';
import { useSiteCopy } from '@/hooks/useSiteCopy';

const iconMap: Record<string, LucideIcon> = {
  github: Github,
  linkedin: Linkedin,
  mail: Mail,
  code: Code2,
};

export default function Footer() {
  const { data } = useProfile();
  const p = data?.data;
  const year = new Date().getFullYear();
  const f = useSiteCopy('footer', {
    wordmark: '<emon />',
    linkProjects: 'Projects',
    linkBlog: 'Blog',
    linkAdmin: 'Admin',
    builtPrefix: 'Built with',
    builtSuffix: 'using the MERN stack.',
  });

  return (
    <footer className="border-t border-line bg-bg-soft/60">
      <div className="container-x py-12">
        <div className="flex flex-col items-center gap-6 text-center">
          <Link to="/" className="font-mono text-xl font-bold gradient-text">
            {f.wordmark}
          </Link>
          <p className="max-w-md text-sm text-ink-soft">
            {p?.tagline || 'Building responsive, dynamic & scalable web apps.'}
          </p>

          <div className="flex items-center gap-3">
            {(p?.socials ?? []).map((s) => {
              const Icon = iconMap[s.icon] ?? Code2;
              return (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="rounded-xl border border-line bg-bg-card p-2.5 text-ink-soft transition-all hover:-translate-y-1 hover:border-neon/50 hover:text-neon"
                >
                  <Icon className="h-5 w-5" />
                </a>
              );
            })}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-dim">
            <Link to="/projects" className="link-underline hover:text-neon">
              {f.linkProjects}
            </Link>
            <Link to="/blog" className="link-underline hover:text-neon">
              {f.linkBlog}
            </Link>
            <Link to="/admin/login" className="link-underline hover:text-neon">
              {f.linkAdmin}
            </Link>
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-dim">
            © {year} {p?.name || 'Md Jannatul Ferdhous Emon'}. {f.builtPrefix}
            <Heart className="h-3.5 w-3.5 text-neon-pink" /> {f.builtSuffix}
          </p>
        </div>
      </div>
    </footer>
  );
}
