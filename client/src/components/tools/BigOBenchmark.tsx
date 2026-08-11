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
import { Sparkles, AlertTriangle } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import AutoTextarea from '@/components/shared/AutoTextarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import {
  INPUT_GENERATOR_OPTIONS,
  detectInputGenerator,
  isSameInputShape,
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

// One matching, illustrative example per input type (not just per language) — each showcases a different complexity class, so switching "Input your function receives" always has working, relevant code behind it rather than one function that only ever fit a single input shape.
const EXAMPLES: Record<Language, Record<InputGeneratorId, string>> = {
  javascript: {
    number:
      'function fib(n) {\n  if (n <= 1) return n;\n  return fib(n - 1) + fib(n - 2);\n}',
    randomArray:
      'function bubbleSort(arr) {\n  const a = arr.slice();\n  for (let i = 0; i < a.length; i++) {\n    for (let j = 0; j < a.length - i - 1; j++) {\n      if (a[j] > a[j + 1]) {\n        const tmp = a[j];\n        a[j] = a[j + 1];\n        a[j + 1] = tmp;\n      }\n    }\n  }\n  return a;\n}',
    sortedArray:
      'function binarySearch(arr) {\n  let lo = 0;\n  let hi = arr.length - 1;\n  let steps = 0;\n  while (lo <= hi) {\n    steps++;\n    const mid = (lo + hi) >> 1;\n    if (arr[mid] === -1) return steps;\n    if (arr[mid] < -1) lo = mid + 1;\n    else hi = mid - 1;\n  }\n  return steps;\n}',
    nearlySortedArray:
      'function insertionSort(arr) {\n  const a = arr.slice();\n  for (let i = 1; i < a.length; i++) {\n    const key = a[i];\n    let j = i - 1;\n    while (j >= 0 && a[j] > key) {\n      a[j + 1] = a[j];\n      j--;\n    }\n    a[j + 1] = key;\n  }\n  return a;\n}',
    randomString:
      "function countVowels(str) {\n  let count = 0;\n  for (let i = 0; i < str.length; i++) {\n    if ('aeiou'.includes(str[i])) count++;\n  }\n  return count;\n}",
  },
  python: {
    number:
      'def fib(n):\n    if n <= 1:\n        return n\n    return fib(n - 1) + fib(n - 2)',
    randomArray:
      'def bubble_sort(arr):\n    a = list(arr)\n    n = len(a)\n    for i in range(n):\n        for j in range(n - i - 1):\n            if a[j] > a[j + 1]:\n                a[j], a[j + 1] = a[j + 1], a[j]\n    return a',
    sortedArray:
      'def binary_search(arr):\n    lo, hi, steps = 0, len(arr) - 1, 0\n    while lo <= hi:\n        steps += 1\n        mid = (lo + hi) // 2\n        if arr[mid] == -1:\n            return steps\n        if arr[mid] < -1:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return steps',
    nearlySortedArray:
      'def insertion_sort(arr):\n    a = list(arr)\n    for i in range(1, len(a)):\n        key = a[i]\n        j = i - 1\n        while j >= 0 and a[j] > key:\n            a[j + 1] = a[j]\n            j -= 1\n        a[j + 1] = key\n    return a',
    randomString:
      "def count_vowels(s):\n    count = 0\n    for ch in s:\n        if ch in 'aeiou':\n            count += 1\n    return count",
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
  isLive,
  index,
}: {
  fit: CandidateFit;
  isWinner: boolean;
  isLive: boolean;
  index: number;
}) {
  const showR2 = fit.complexityClass !== 'O(1)';
  const fitPercent = Math.max(0, Math.min(100, fit.r2 * 100));
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: 'easeOut' }}
    >
      <GlassCard
        className={cn(
          'p-4 transition-colors duration-300',
          isWinner &&
            (isLive ? 'ring-1 ring-amber-400/60' : 'ring-1 ring-neon/60')
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'font-mono text-base font-bold transition-colors duration-300',
              isWinner
                ? isLive
                  ? 'text-amber-400'
                  : 'text-neon'
                : 'text-foreground'
            )}
          >
            {fit.complexityClass}
          </span>
          {isWinner && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-2xs font-semibold transition-colors duration-300',
                isLive
                  ? 'bg-amber-400/10 text-amber-400'
                  : 'bg-neon/10 text-neon'
              )}
            >
              {isLive ? 'Leading' : 'Best fit'}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {CLASS_HINT[fit.complexityClass]}
        </p>
        {showR2 && (
          <div className="mt-2.5">
            <div className="h-1 w-full overflow-hidden rounded-full bg-bg-elevated">
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  isWinner
                    ? isLive
                      ? 'bg-amber-400'
                      : 'bg-neon-gradient'
                    : 'bg-muted-foreground/40'
                )}
                initial={{ width: 0 }}
                animate={{ width: `${fitPercent}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            <p className="mt-1 text-2xs text-muted-foreground/70">
              Fit quality: {fitPercent.toFixed(1)}%
            </p>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

export default function BigOBenchmark() {
  const [language, setLanguage] = useState<Language>('javascript');
  const [source, setSource] = useState(EXAMPLES.javascript.randomArray);
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
  // Accumulates live, one point per progress message — the chart and complexity estimate below are reactive to this the whole run, not just once a final result arrives, so the actual empirical curve visibly builds in real time.
  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  // Best-effort suggestion only, never auto-applied — a mismatched input type is the most common cause of an immediate run error, so surface it before the user hits Run rather than only after a crash.
  const suggestedInputGenerator = useMemo(
    () => detectInputGenerator(source, language),
    [source, language]
  );
  const inputMismatch = !isSameInputShape(
    suggestedInputGenerator,
    inputGenerator
  )
    ? INPUT_GENERATOR_OPTIONS.find((o) => o.id === suggestedInputGenerator)
    : null;
  // Whether the editor still holds one of the stock examples (untouched) — used to decide whether switching input type may safely swap in the matching example, versus a custom snippet the user is actively editing.
  const isUnmodifiedExample = Object.values(EXAMPLES[language]).includes(
    source
  );

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

  const resetRunState = (): void => {
    setEntryName('');
    setStatus('idle');
    setError(null);
    setMeasurements([]);
  };

  const onLoadExample = (): void => {
    setSource(EXAMPLES[language][inputGenerator]);
    resetRunState();
  };
  const onLanguageChange = (next: Language): void => {
    setLanguage(next);
    setSource(EXAMPLES[next][inputGenerator]);
    resetRunState();
  };
  const onInputGeneratorChange = (next: InputGeneratorId): void => {
    setInputGenerator(next);
    // Only swap the code when the editor still holds an unmodified example — never overwrite a snippet the user is actively writing.
    if (isUnmodifiedExample) setSource(EXAMPLES[language][next]);
  };

  const run = (): void => {
    if (!source.trim() || status === 'running') return;
    setStatus('running');
    setError(null);
    setMeasurements([]);
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
        setMeasurements((prev) => [...prev, { n: msg.n, timeMs: msg.timeMs }]);
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

  // Recomputed on every new point, live — cheap closed-form regression, so re-fitting on each of the ~10-20 progress messages in a run is not a performance concern, and it's what makes the estimate below visibly refine itself in real time.
  const result: ComplexityResult | null = useMemo(() => {
    if (measurements.length < 4) return null;
    try {
      return fitComplexity(measurements);
    } catch {
      return null;
    }
  }, [measurements]);

  const chartData = useMemo(
    () => measurements.map((m) => ({ n: m.n, timeMs: m.timeMs })),
    [measurements]
  );
  const fitLine = useMemo(() => {
    if (!result || measurements.length === 0) return [];
    const ns = measurements.map((m) => m.n);
    const minN = Math.min(...ns);
    const maxN = Math.max(...ns);
    const steps = 40;
    return Array.from({ length: steps }, (_, i) => {
      const n = Math.round(minN * Math.pow(maxN / minN, i / (steps - 1)));
      return { n, fit: result.winner.predict(n) };
    });
  }, [result, measurements]);
  // Explicit ticks at the actual measured N values, rather than Recharts' auto-generated log-scale ticks — those can round two nearby "nice" values to the same displayed label on a wide range, producing a duplicate-key warning. Thinned to a readable count for runs with many points; always unique since N strictly increases every step.
  const xTicks = useMemo(() => {
    if (measurements.length === 0) return undefined;
    const ns = measurements.map((m) => m.n);
    const maxTicks = 8;
    if (ns.length <= maxTicks) return ns;
    const step = (ns.length - 1) / (maxTicks - 1);
    return Array.from(
      { length: maxTicks },
      (_, i) => ns[Math.round(i * step)]!
    );
  }, [measurements]);

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
              onInputGeneratorChange(e.target.value as InputGeneratorId)
            }
          >
            {INPUT_GENERATOR_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label} — {opt.signatureHint}
              </option>
            ))}
          </select>
          {inputMismatch && status !== 'running' && (
            <p className="mt-1.5 text-2xs text-amber-400">
              Your code looks like it expects{' '}
              {inputMismatch.label.toLowerCase()}.{' '}
              <button
                type="button"
                onClick={() => setInputGenerator(inputMismatch.id)}
                className="underline underline-offset-2 hover:text-amber-300"
              >
                Switch to match
              </button>
            </p>
          )}
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

      {error && (
        <div className="mt-4 flex gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5">
          <AlertTriangle className="h-4 w-4 shrink-0 translate-y-0.5 text-destructive" />
          <p className="whitespace-pre-wrap text-sm text-destructive">
            {error}
          </p>
        </div>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6"
        >
          <div className="mb-2 flex items-center gap-2">
            {status === 'running' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                </span>
                <span className="text-2xs font-medium text-amber-400">
                  Measuring live — estimate refines as more data arrives
                </span>
              </>
            ) : status === 'error' ? (
              <span className="text-2xs font-medium text-muted-foreground">
                Stopped early — showing data measured before the error
              </span>
            ) : (
              <span className="text-2xs font-medium text-neon">
                Measurement complete
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} />
              <XAxis
                dataKey="n"
                type="number"
                scale="log"
                domain={['auto', 'auto']}
                ticks={xTicks}
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
            {result.contenders.map((fit, index) => (
              <CandidateRow
                key={fit.complexityClass}
                fit={fit}
                isWinner={fit === result.winner}
                isLive={status === 'running'}
                index={index}
              />
            ))}
          </div>
        </motion.div>
      )}
    </GlassCard>
  );
}
