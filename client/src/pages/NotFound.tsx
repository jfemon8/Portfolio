import { Link } from 'react-router-dom';
import Seo from '@/components/ui/Seo';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <>
      <Seo title="404 — Not found" noindex />
      <div className="container-x grid min-h-[70vh] place-items-center text-center">
        <div>
          <p className="font-mono text-7xl font-extrabold gradient-text">404</p>
          <p className="mt-4 font-mono text-muted-foreground">
            <span className="text-neon">$</span> cd {window.location.pathname}
            <br />
            bash: no such file or directory
          </p>
          <Link to="/" className="mt-8 inline-block">
            <Button>cd ~/home</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
