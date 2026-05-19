import { useState } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { Terminal, Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import PremiumBackground from '@/components/layout/PremiumBackground';
import GlassCard from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import Seo from '@/components/ui/Seo';
import type { ApiError } from '@/types';
import { useSiteCopy } from '@/hooks/useSiteCopy';

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
  const c = useSiteCopy('auth', {
    panelTitle: 'Admin Panel',
    panelSubtitle: 'Sign in to manage your portfolio',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    emailRequired: 'Email required',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    passwordRequired: 'Password required',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    footer: 'Protected area · authorized access only',
    welcomeToast: 'Welcome back 👋',
    failToast: 'Login failed',
  });

  if (!loading && isAuthed) return <Navigate to={from} replace />;

  const onSubmit = async ({ email, password }: LoginForm): Promise<void> => {
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success(c.welcomeToast);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error((err as ApiError).message || c.failToast);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Seo title="Admin Login" noindex />
      <div className="relative grid min-h-screen place-items-center bg-background px-5">
        <PremiumBackground />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-sm"
        >
          <Link
            to="/"
            className="mb-8 flex items-center justify-center gap-2 font-mono text-xl font-bold"
          >
            <Terminal className="h-6 w-6 text-neon" />
            <span className="gradient-text">emon</span>
            <span className="animate-blink text-neon">_</span>
          </Link>

          <GlassCard className="p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-primary/30 bg-card/60 text-neon">
                <Lock className="h-5 w-5" />
              </span>
              <div>
                <h1 className="font-bold text-foreground">{c.panelTitle}</h1>
                <p className="text-xs text-muted-foreground/70">
                  {c.panelSubtitle}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label">{c.emailLabel}</label>
                <input
                  className="input"
                  type="email"
                  autoComplete="username"
                  placeholder={c.emailPlaceholder}
                  {...register('email', { required: c.emailRequired })}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label className="label">{c.passwordLabel}</label>
                <input
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  placeholder={c.passwordPlaceholder}
                  {...register('password', { required: c.passwordRequired })}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <Button
                disabled={submitting}
                className="w-full"
                size="lg"
                type="submit"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {c.signingIn}
                  </>
                ) : (
                  c.signIn
                )}
              </Button>
            </form>
          </GlassCard>
          <p className="mt-5 text-center text-xs text-muted-foreground/60">
            {c.footer}
          </p>
        </motion.div>
      </div>
    </>
  );
}
