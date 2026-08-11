import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Sparkles } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import AutoTextarea from '@/components/shared/AutoTextarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import {
  INPUT_GENERATOR_OPTIONS,
  type InputGeneratorId,
} from '@/lib/inputGenerators';
import {
  fitComplexity,
  type CandidateFit,
  type ComplexityClass,
  type ComplexityResult,
  type Measurement,
} from '@/lib/complexityFit';
import type {
  Language,
  RunRequest,
  ProgressMessage,
  ResultMessage,
  ErrorMessage,
} from '@/workers/bigoBenchmark.types';

const axisStroke = 'hsl(var(--muted-foreground))';
const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 12,
  color: 'hsl(var(--foreground))',
} as const;

// Beyond the worker's own ~12s cooperative budget — only fires for a genuine infinite loop, which the worker can never catch itself since it never regains control.
const WATCHDOG_MS = 20_000;

const EXAMPLES: Record<
  Language,
  { source: string; inputGenerator: InputGeneratorId }
> = {
  javascript: {
    source:
      'function bubbleSort(arr) {\n  const a = arr.slice();\n  for (let i = 0; i < a.length; i++) {\n    for (let j = 0; j < a.length - i - 1; j++) {\n      if (a[j] > a[j + 1]) {\n        const tmp = a[j];\n        a[j] = a[j + 1];\n        a[j + 1] = tmp;\n      }\n    }\n  }\n  return a;\n}',
    inputGenerator: 'randomArray',
  },
  python: {
    source:
      'def bubble_sort(arr):\n    a = list(arr)\n    n = len(a)\n    for i in range(n):\n        for j in range(n - i - 1):\n            if a[j] > a[j + 1]:\n                a[j], a[j + 1] = a[j + 1], a[j]\n    return a',
    inputGenerator: 'randomArray',
  },
};

const CLASS_HINT: Record<ComplexityClass, string> = {
  'O(1)': 'Constant — time barely changes with input size.',
  'O(log n)': 'Logarithmic — grows very slowly (e.g. binary search).',
  'O(n)': 'Linear — time grows proportionally with input size.',
  'O(n log n)': 'Log-linear — typical of efficient sorting (merge/quick sort).',
  'O(n^2)': 'Quadratic — typical of nested loops (e.g. bubble sort).',
  'O(n^3)': 'Cubic — typical of triple-nested loops.',
  'O(2^n)':
    'Exponential — grows extremely fast (e.g. naive recursive Fibonacci).',
};

type RunStatus = 'idle' | 'running' | 'done' | 'error';
type WorkerMessage = ProgressMessage | ResultMessage | ErrorMessage;

function CandidateRow({
  fit,
  isWinner,
}: {
  fit: CandidateFit;
  isWinner: boolean;
}) {
  const showR2 = fit.complexityClass !== 'O(1)';
  return (
    <GlassCard className={cn('p-4', isWinner && 'ring-1 ring-neon/60')}>
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'font-mono text-base font-bold',
            isWinner ? 'text-neon' : 'text-foreground'
          )}
        >
          {fit.complexityClass}
        </span>
        {isWinner && (
          <span className="rounded-full bg-neon/10 px-2 py-0.5 text-2xs font-semibold text-neon">
            Best fit
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {CLASS_HINT[fit.complexityClass]}
      </p>
      {showR2 && (
        <p className="mt-2 text-2xs text-muted-foreground/70">
          Fit quality: {(fit.r2 * 100).toFixed(1)}%
        </p>
      )}
    </GlassCard>
  );
}

export default function BigOBenchmark() {
  const [language, setLanguage] = useState<Language>('javascript');
  const [source, setSource] = useState(EXAMPLES.javascript.source);
  const [entryName, setEntryName] = useState('');
  const [inputGenerator, setInputGenerator] =
    useState<InputGeneratorId>('randomArray');
  const [status, setStatus] = useState<RunStatus>('idle');
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    n: number;
  } | null>(null);
  const [pyodideLoading, setPyodideLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[] | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearWatchdog = (): void => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  };

  useEffect(
    () => () => {
      clearWatchdog();
      workerRef.current?.terminate();
    },
    []
  );

  const applyLanguageDefaults = (next: Language): void => {
    setSource(EXAMPLES[next].source);
    setInputGenerator(EXAMPLES[next].inputGenerator);
    setEntryName('');
    setStatus('idle');
    setError(null);
    setMeasurements(null);
  };

  const onLoadExample = (): void => applyLanguageDefaults(language);
  const onLanguageChange = (next: Language): void => {
    setLanguage(next);
    applyLanguageDefaults(next);
  };

  const run = (): void => {
    if (!source.trim() || status === 'running') return;
    setStatus('running');
    setError(null);
    setMeasurements(null);
    setProgress(null);
    setPyodideLoading(language === 'python');

    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../../workers/bigoBenchmark.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    const worker = workerRef.current;

    const onMessage = (e: MessageEvent<WorkerMessage>): void => {
      const msg = e.data;
      if (msg.type === 'progress') {
        setProgress({ done: msg.done, total: msg.total, n: msg.n });
        setPyodideLoading(false);
      } else if (msg.type === 'result') {
        clearWatchdog();
        worker.removeEventListener('message', onMessage);
        setMeasurements(msg.measurements);
        setStatus('done');
      } else if (msg.type === 'error') {
        clearWatchdog();
        worker.removeEventListener('message', onMessage);
        setError(msg.message);
        setStatus('error');
      }
    };
    worker.addEventListener('message', onMessage);

    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      worker.terminate();
      workerRef.current = null; // this worker is gone — next run spins up a fresh one
      setError(
        'This is taking far longer than expected (possible infinite loop) — stopped.'
      );
      setStatus('error');
    }, WATCHDOG_MS);

    const req: RunRequest = {
      type: 'run',
      language,
      source,
      entryName: entryName.trim() || undefined,
      inputGenerator,
    };
    worker.postMessage(req);
  };

  const result: ComplexityResult | null = useMemo(() => {
    if (!measurements || measurements.length < 4) return null;
    try {
      return fitComplexity(measurements);
    } catch {
      return null;
    }
  }, [measurements]);

  const chartData = useMemo(
    () => measurements?.map((m) => ({ n: m.n, timeMs: m.timeMs })) ?? [],
    [measurements]
  );
  const fitLine = useMemo(() => {
    if (!result || !measurements || measurements.length === 0) return [];
    const ns = measurements.map((m) => m.n);
    const minN = Math.min(...ns);
    const maxN = Math.max(...ns);
    const steps = 40;
    return Array.from({ length: steps }, (_, i) => {
      const n = Math.round(minN * Math.pow(maxN / minN, i / (steps - 1)));
      return { n, fit: result.winner.predict(n) };
    });
  }, [result, measurements]);

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {(['javascript', 'python'] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              disabled={status === 'running'}
              onClick={() => onLanguageChange(lang)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors disabled:opacity-50',
                language === lang
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border/70 text-muted-foreground hover:border-primary/30 hover:text-foreground'
              )}
            >
              {lang === 'javascript' ? 'JavaScript' : 'Python'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onLoadExample}
          disabled={status === 'running'}
          className="flex items-center gap-1 text-2xs text-muted-foreground transition-colors hover:text-neon disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" /> Load example
        </button>
      </div>

      <AutoTextarea
        className="input mt-3 min-h-40 font-mono text-xs"
        value={source}
        disabled={status === 'running'}
        onChange={(e) => setSource(e.target.value)}
        placeholder={
          language === 'javascript'
            ? 'function solve(input) { ... }'
            : 'def solve(input):\n    ...'
        }
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="bigo-input-type">
            Input your function receives
          </label>
          <select
            id="bigo-input-type"
            className="input text-sm"
            value={inputGenerator}
            disabled={status === 'running'}
            onChange={(e) =>
              setInputGenerator(e.target.value as InputGeneratorId)
            }
          >
            {INPUT_GENERATOR_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label} — {opt.signatureHint}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="bigo-entry-name">
            Entry function name{' '}
            <span className="normal-case text-muted-foreground/60">
              (only needed if you have more than one)
            </span>
          </label>
          <input
            id="bigo-entry-name"
            className="input font-mono text-sm"
            placeholder="auto-detected"
            value={entryName}
            disabled={status === 'running'}
            onChange={(e) => setEntryName(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={run} disabled={status === 'running' || !source.trim()}>
          {status === 'running' ? 'Running…' : 'Run Benchmark'}
        </Button>
        <p className="text-2xs text-muted-foreground/70">
          Runs entirely in your browser — your code never leaves this page.
        </p>
      </div>

      {status === 'running' && (
        <div className="mt-4">
          {pyodideLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading the Python runtime (~10MB, one-time)…
            </p>
          ) : (
            <>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
                <motion.div
                  className="h-full bg-neon-gradient"
                  animate={{
                    width: progress
                      ? `${Math.min(100, (progress.done / progress.total) * 100)}%`
                      : '5%',
                  }}
                  transition={{ ease: 'easeOut' }}
                />
              </div>
              <p className="mt-1.5 text-2xs text-muted-foreground">
                {progress
                  ? `Testing input size N=${progress.n}… (${progress.done} sizes measured so far)`
                  : 'Starting…'}
              </p>
            </>
          )}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-neon-pink">{error}</p>}

      {status === 'done' && result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6"
        >
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} />
              <XAxis
                dataKey="n"
                type="number"
                scale="log"
                domain={['auto', 'auto']}
                stroke={axisStroke}
                fontSize={11}
                label={{
                  value: 'Input size (N)',
                  position: 'insideBottom',
                  offset: -10,
                  fill: axisStroke,
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                scale="log"
                domain={['auto', 'auto']}
                stroke={axisStroke}
                fontSize={11}
                label={{
                  value: 'Time (ms)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: axisStroke,
                  fontSize: 11,
                }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                data={fitLine}
                dataKey="fit"
                name="Fitted curve"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Scatter
                data={chartData}
                dataKey="timeMs"
                name="Measured"
                fill="#00ffd1"
              />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="mt-1 text-center text-2xs text-muted-foreground/70">
            Measured growth curve ≈ N^{result.exponentEstimate.toFixed(2)}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.contenders.map((fit) => (
              <CandidateRow
                key={fit.complexityClass}
                fit={fit}
                isWinner={fit === result.winner}
              />
            ))}
          </div>
        </motion.div>
      )}
    </GlassCard>
  );
}
