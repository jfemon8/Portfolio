import { Link } from 'react-router-dom';
import Seo from '@/components/ui/Seo';
import { Button } from '@/components/ui/button';
import { useSiteCopy } from '@/hooks/useSiteCopy';

export default function NotFound() {
  const c = useSiteCopy('states', {
    notFoundError: 'bash: no such file or directory',
    notFoundHome: 'cd ~/home',
  });
  return (
    <>
      <Seo title="404 — Not found" noindex />
      <div className="container-x grid min-h-[70vh] place-items-center text-center">
        <div>
          <p className="font-mono text-7xl font-extrabold gradient-text">404</p>
          <p className="mt-4 font-mono text-muted-foreground">
            <span className="text-neon">$</span> cd{' '}
            <span className="break-all">{window.location.pathname}</span>
            <br />
            {c.notFoundError}
          </p>
          <Link to="/" className="mt-8 inline-block">
            <Button>{c.notFoundHome}</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
