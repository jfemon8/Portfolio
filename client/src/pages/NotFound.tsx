import { Link } from 'react-router-dom';
import Seo from '@/components/ui/Seo';

export default function NotFound() {
  return (
    <>
      <Seo title="404 — Not found" />
      <div className="container-x grid min-h-[70vh] place-items-center text-center">
        <div>
          <p className="font-mono text-7xl font-extrabold gradient-text">404</p>
          <p className="mt-4 font-mono text-ink-soft">
            <span className="text-neon">$</span> cd {window.location.pathname}
            <br />
            bash: no such file or directory
          </p>
          <Link to="/" className="btn-primary mt-8">
            cd ~/home
          </Link>
        </div>
      </div>
    </>
  );
}
