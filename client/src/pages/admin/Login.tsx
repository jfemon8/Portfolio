import { useState } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Terminal, Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Seo from '@/components/ui/Seo';
import type { ApiError } from '@/types';

interface LoginForm {
  email: string;
  password: string;
}

export default function Login() {
  const { login, isAuthed, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname || '/admin';

  if (!loading && isAuthed) return <Navigate to={from} replace />;

  const onSubmit = async ({ email, password }: LoginForm): Promise<void> => {
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success('Welcome back 👋');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error((err as ApiError).message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Seo title="Admin Login" />
      <div className="grid min-h-screen place-items-center bg-bg px-5">
        <div className="w-full max-w-sm">
          <Link
            to="/"
            className="mb-8 flex items-center justify-center gap-2 font-mono text-xl font-bold"
          >
            <Terminal className="h-6 w-6 text-neon" />
            <span className="gradient-text">emon</span>
            <span className="animate-blink text-neon">_</span>
          </Link>

          <div className="glass p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-neon/30 bg-bg-elevated text-neon">
                <Lock className="h-5 w-5" />
              </span>
              <div>
                <h1 className="font-bold">Admin Panel</h1>
                <p className="text-xs text-ink-dim">
                  Sign in to manage your portfolio
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  autoComplete="username"
                  placeholder="you@example.com"
                  {...register('email', { required: 'Email required' })}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-neon-pink">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password', { required: 'Password required' })}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-neon-pink">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <button
                disabled={submitting}
                className="btn-primary w-full"
                type="submit"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>
          <p className="mt-5 text-center text-xs text-ink-dim">
            Credentials are created by the seed script — see docs/07.
          </p>
        </div>
      </div>
    </>
  );
}
