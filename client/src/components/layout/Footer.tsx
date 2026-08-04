import { Link } from 'react-router-dom';
import { useProfile } from '@/hooks/usePortfolio';
import { useSiteCopy } from '@/hooks/useSiteCopy';
import { SocialIcon } from '@/lib/socialIcon';

export default function Footer() {
  const { data } = useProfile();
  const p = data?.data;
  const year = new Date().getFullYear();
  const f = useSiteCopy('footer', {
    wordmark: '<emon />',
    linkProjects: 'Projects',
    linkBlog: 'Blog',
    linkAdmin: 'Admin',
  });

  return (
    <footer className="border-t border-border bg-card/90 dark:border-line dark:bg-bg-soft/60">
      <div className="container-x py-12">
        <div className="flex flex-col items-center gap-6 text-center">
          <Link to="/" className="font-mono text-xl font-bold gradient-text">
            {f.wordmark}
          </Link>
          <p className="text-sm text-ink-soft">
            {p?.tagline || 'Building responsive, dynamic & scalable web apps.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {(p?.socials ?? []).map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="rounded-xl border border-line bg-bg-card p-3 text-ink-soft transition-all hover:border-neon/50 hover:text-neon"
              >
                <SocialIcon social={s} />
              </a>
            ))}
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

          <p className="mt-4 text-xs text-ink-dim">
            © {year} {p?.name || 'Md Jannatul Ferdhous Emon'}.
          </p>
        </div>
      </div>
    </footer>
  );
}
