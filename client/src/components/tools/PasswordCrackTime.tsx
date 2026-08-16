import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, ShieldCheck, Zap } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import { cn } from '@/lib/cn';
import {
  analyzePassword,
  crackTimeAtRate,
  formatCrackTime,
  type PasswordAnalysis,
} from '@/lib/passwordStrength';
import type {
  BenchmarkRequest,
  BenchmarkResultMessage,
} from '@/workers/passwordBenchmark.types';

const DEBOUNCE_MS = 300;

const SCORE_LABEL: Record<PasswordAnalysis['score'], string> = {
  0: 'Very weak',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Strong',
};

function scoreClasses(score: PasswordAnalysis['score']): {
  bar: string;
  text: string;
} {
  if (score <= 1) return { bar: 'bg-destructive', text: 'text-destructive' };
  if (score === 2) return { bar: 'bg-amber-400', text: 'text-amber-400' };
  return { bar: 'bg-neon-gradient', text: 'text-neon' };
}

interface ScenarioRowProps {
  label: string;
  time: string;
  highlight?: boolean;
}

function ScenarioRow({ label, time, highlight }: ScenarioRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm',
        highlight ? 'border border-neon/40 bg-neon/5' : 'bg-bg-elevated/50'
      )}
    >
      <span
        className={cn(
          'text-muted-foreground',
          highlight && 'font-medium text-neon'
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'font-mono font-semibold text-foreground',
          highlight && 'text-neon'
        )}
      >
        {time}
      </span>
    </div>
  );
}

export default function PasswordCrackTime() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [analysis, setAnalysis] = useState<PasswordAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hashesPerSecond, setHashesPerSecond] = useState<number | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  // Benchmarks this device once, up front — it doesn't depend on anything the visitor types, so there's no reason to wait for a password before finding out how fast this browser can hash.
  useEffect(() => {
    const worker = new Worker(
      new URL('../../workers/passwordBenchmark.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<BenchmarkResultMessage>) => {
      if (e.data.type === 'result') setHashesPerSecond(e.data.hashesPerSecond);
    };
    worker.postMessage({ type: 'benchmark' } satisfies BenchmarkRequest);
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!password) {
      setAnalysis(null);
      setAnalyzing(false);
      return;
    }
    setAnalyzing(true);
    setLoadError(null);
    const requestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(() => {
      void analyzePassword(password)
        .then((result) => {
          // A later keystroke's analysis may resolve before an earlier one if the dictionary was still loading on the first call — only the most recent request is allowed to land.
          if (requestId === requestIdRef.current) {
            setAnalysis(result);
            setAnalyzing(false);
          }
        })
        .catch(() => {
          // Without this the skeleton spins forever whenever the dictionary chunk fails to load.
          if (requestId === requestIdRef.current) {
            setAnalyzing(false);
            setLoadError(
              "Couldn't load the password dictionary — check your connection and type again."
            );
          }
        });
    }, DEBOUNCE_MS);
  }, [password]);

  const liveCrackTime = useMemo(() => {
    if (!analysis || hashesPerSecond === null) return null;
    return formatCrackTime(crackTimeAtRate(analysis.guesses, hashesPerSecond));
  }, [analysis, hashesPerSecond]);

  return (
    <GlassCard className="p-6">
      <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-bg-elevated/40 p-3.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 translate-y-0.5 text-neon" />
        <p>
          Your password is never sent anywhere, logged, or stored — not even to
          check it.
        </p>
      </div>

      <div className="relative mt-4">
        <input
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          spellCheck={false}
          className="input pr-11 font-mono text-sm"
          placeholder="Type a password to test…"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>

      {password && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-4"
        >
          {loadError ? (
            <p className="text-xs text-destructive">{loadError}</p>
          ) : analyzing || !analysis ? (
            <div className="h-1.5 w-full animate-pulse rounded-full bg-bg-elevated" />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
                  <motion.div
                    className={cn(
                      'h-full rounded-full',
                      scoreClasses(analysis.score).bar
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${(analysis.score / 4) * 100}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>
                <span
                  className={cn(
                    'ml-3 shrink-0 text-xs font-semibold',
                    scoreClasses(analysis.score).text
                  )}
                >
                  {SCORE_LABEL[analysis.score]}
                </span>
              </div>

              {analysis.warning && (
                <p className="mt-2 text-xs text-amber-400">
                  {analysis.warning}
                </p>
              )}
              {analysis.suggestions.length > 0 && (
                <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                  {analysis.suggestions.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              )}

              <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-neon" />
                {hashesPerSecond === null ? (
                  <span>Benchmarking this device…</span>
                ) : (
                  <span>
                    This browser just computed{' '}
                    <span className="font-mono font-semibold text-neon">
                      {Math.round(hashesPerSecond).toLocaleString()}
                    </span>{' '}
                    SHA-256 hashes/sec, right now, on this device.
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-1.5">
                {liveCrackTime && (
                  <ScenarioRow
                    label="Estimated on your device, right now"
                    time={liveCrackTime}
                    highlight
                  />
                )}
                <ScenarioRow
                  label="Offline attack, fast hash (e.g. unsalted MD5/SHA-1, GPU-class hardware)"
                  time={analysis.crackTimes.offlineFastHash}
                />
                <ScenarioRow
                  label="Offline attack, slow hash (properly salted bcrypt/scrypt/Argon2)"
                  time={analysis.crackTimes.offlineSlowHash}
                />
                <ScenarioRow
                  label="Online attack, no rate limiting"
                  time={analysis.crackTimes.onlineUnthrottled}
                />
                <ScenarioRow
                  label="Online attack, throttled login attempts"
                  time={analysis.crackTimes.onlineThrottled}
                />
              </div>
              <p className="mt-3 text-2xs text-muted-foreground/70">
                Your device's measured rate is a browser tab doing plain SHA-256
                — a real attacker with dedicated GPU/ASIC hardware typically
                reaches far higher throughput than one tab can, so treat the
                fast-hash scenario above as a conservative floor on real-world
                risk, not a ceiling. This is exactly why slow, purpose-built
                hashes like bcrypt matter for how a service stores your password
                in the first place.
              </p>
            </>
          )}
        </motion.div>
      )}
    </GlassCard>
  );
}
