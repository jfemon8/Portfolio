import {
  generateInput,
  INPUT_GENERATOR_OPTIONS,
  type InputGeneratorId,
} from '@/lib/inputGenerators';
import type {
  RunRequest,
  Language,
  ProgressMessage,
  ResultMessage,
  ErrorMessage,
} from './bigoBenchmark.types';

// Pyodide has no published types for this CDN-loaded, version-pinned path; treated as an opaque handle the few call sites below cast at the point of use, rather than fighting for types across a library we don't control.
type PyodideInterface = {
  runPython: (code: string) => unknown;
  globals: { get: (name: string) => unknown };
  toPy: (value: unknown) => unknown;
};

// Verified current via `npm view pyodide version`; re-check at upgrade time, the CDN path is version-pinned.
const PYODIDE_VERSION = '314.0.3';

const WARMUP_CALLS = 3;
const BATCH_FLOOR_MS = 50;
// Ceiling on calibration growth, kept high since the timed loop itself is cheap (pool-bounded, no extra allocation) and `deadline` is still checked every growth step regardless, so a low cap here would only starve fast functions of measurable resolution without saving any time.
const MAX_REPEAT = 2_000_000;
// Bounds allocation/GC volume per calibration step independently of `repeat`; see calibratedPerCallMs.
const INPUT_POOL_SIZE = 256;
// Adaptive batch count per N: collects at least this many post-warmup batches before stability is even considered...
const MIN_BATCHES_PER_N = 3;
// ...but never more than this many, bounding worst-case time even for a persistently noisy function.
const MAX_BATCHES_PER_N = 8;
// Stop collecting batches once their spread (MAD/median, robust to a single outlier batch) falls at or below this fraction, so stable functions finish in fewer batches while noisy ones automatically get more.
const STABILITY_CV = 0.08;
const PER_CALL_STOP_MS = 500;
const TOTAL_BUDGET_MS = 12_000;
// Absolute backstop, comfortably under the main thread's watchdog termination: always cooperatively stop by here even if MIN_DATA_POINTS below was never reached, since a superlinear function's cost can keep multiplying per N step and chasing MIN_DATA_POINTS could otherwise escalate N well past what's safe to attempt.
const HARD_DEADLINE_MS = 16_000;
const MIN_DATA_POINTS = 8;
// The classifier's own MIN_MEASUREMENTS floor: below this a fit can't even be attempted, so a too-slow function is still allowed to push one step further (bounded by HARD_DEADLINE_MS regardless) to try to clear it.
const HARD_MIN_DATA_POINTS = 4;
// Guards only against a literal exact-0 reading (breaks log-scale charting and the O(2^n) candidate's log-response fit), kept far below any real measurement, since calibration resolves down to single-digit-nanosecond per-call costs for cheap operations and a coarser floor would clip that real signal instead of just catching the zero case.
const MIN_MEASURABLE_MS = 1e-7;
const PROGRESS_TOTAL_ESTIMATE = 13;
const EPS = 1e-9;

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

// Median absolute deviation normalized by the median: a coefficient-of-variation analog that (unlike stdev/mean) a single outlier batch can't blow up.
function relativeSpread(xs: number[]): number {
  const mid = median(xs);
  if (mid <= 0) return Infinity;
  return median(xs.map((x) => Math.abs(x - mid))) / mid;
}

// --- JavaScript extraction ---------------------------------------------

function detectSoleJsBinding(source: string): string | null {
  const matches = [
    ...source.matchAll(
      /^\s*(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=)/gm
    ),
  ];
  const names = [
    ...new Set(
      matches.map((m) => m[1] ?? m[2]).filter((n): n is string => !!n)
    ),
  ];
  return names.length === 1 ? names[0]! : null;
}

// Two-attempt extraction: the whole snippet as one expression so a named function expression self-binds for recursion, else run it as a program and pull out a named top-level binding.
function extractJsFunction(
  source: string,
  entryName?: string
): (input: unknown) => unknown {
  try {
    const fn = new Function(`"use strict"; return (${source}\n);`)();
    if (typeof fn === 'function') return fn as (input: unknown) => unknown;
  } catch {
    // Not a single expression; fall through to the whole-program attempt.
  }

  const name = entryName || detectSoleJsBinding(source);
  if (!name) {
    throw new Error(
      'Could not find a single function to run. If your snippet has multiple functions, set "Entry function name".'
    );
  }
  const fn = new Function(
    `"use strict"; ${source}\n; return typeof ${name} !== "undefined" ? ${name} : undefined;`
  )();
  if (typeof fn !== 'function') {
    throw new Error(`"${name}" is not a function.`);
  }
  return fn as (input: unknown) => unknown;
}

// --- Python extraction (Pyodide) ----------------------------------------

let pyodideInstance: PyodideInterface | null = null;
let pyodideLoadPromise: Promise<PyodideInterface> | null = null;

async function getPyodide(): Promise<PyodideInterface> {
  if (pyodideInstance) return pyodideInstance;
  pyodideLoadPromise ??= (async () => {
    // Dynamic ESM import (importScripts is spec-disallowed in module workers), CDN-hosted rather than an npm dependency so JS-only visitors never pay for this download.
    const mod = (await import(
      /* @vite-ignore */ `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.mjs`
    )) as { loadPyodide: () => Promise<PyodideInterface> };
    const pyodide = await mod.loadPyodide();
    pyodideInstance = pyodide;
    return pyodide;
  })();

  try {
    return await pyodideLoadPromise;
  } catch (err) {
    // A cached rejection would keep failing after the network recovers, with only a reload to clear it.
    pyodideLoadPromise = null;
    throw err;
  }
}

function detectSolePyBinding(source: string): string | null {
  const names = [
    ...new Set(
      [...source.matchAll(/^def\s+(\w+)\s*\(/gm)]
        .map((m) => m[1])
        .filter((n): n is string => !!n)
    ),
  ];
  return names.length === 1 ? names[0]! : null;
}

function extractPyFunction(
  pyodide: PyodideInterface,
  source: string,
  entryName?: string
): (input: unknown) => unknown {
  pyodide.runPython(source); // once; re-running per trial would make parse time dominate every measurement
  const name = entryName || detectSolePyBinding(source);
  if (!name) {
    throw new Error(
      'Could not find a single function to run. If your snippet has multiple functions, set "Entry function name".'
    );
  }
  const fn = pyodide.globals.get(name);
  if (typeof fn !== 'function') {
    throw new Error(`"${name}" is not a callable Python function.`);
  }
  return fn as (input: unknown) => unknown;
}

// --- Calibrated timing ---------------------------------------------------

interface Runner {
  prepareInput: (n: number) => unknown;
  call: (input: unknown) => unknown;
  /** Destroys a PyProxy result: Python only, called after *every* call (each result is a fresh object). */
  cleanupResult?: (result: unknown) => void;
  /** Destroys a PyProxy input: Python only, called *once per pool item* after the pool is done being cycled through, not per-call (an input can be reused across many calls; destroying it after its first use would leave later reuses operating on freed WASM memory, hanging the run). */
  cleanupInput?: (input: unknown) => void;
  /** JIT warm-up matters for JS; CPython-via-Pyodide is a bytecode interpreter with no JIT, so it's skipped there. */
  warmup: boolean;
}

function makeJsRunner(
  fn: (input: unknown) => unknown,
  inputGenerator: InputGeneratorId
): Runner {
  return {
    prepareInput: (n) => generateInput(inputGenerator, n),
    call: fn,
    warmup: true,
  };
}

function makePyRunner(
  pyodide: PyodideInterface,
  fn: (input: unknown) => unknown,
  inputGenerator: InputGeneratorId
): Runner {
  const destroy = (v: unknown): void =>
    (v as { destroy?: () => void } | null)?.destroy?.();
  return {
    // Marshalled to a Python object here, outside the timed region; converting inside the timed loop would measure JS<->Python FFI cost, not the algorithm.
    prepareInput: (n) => pyodide.toPy(generateInput(inputGenerator, n)),
    call: fn,
    cleanupResult: destroy,
    cleanupInput: destroy,
    warmup: false,
  };
}

// Folded into every call's return value and read once at the end of a run; a result nobody reads is exactly what V8 can prove is dead and eliminate, letting a trivial function like `return arr[0]` measure in single-digit nanoseconds (faster than a JIT-compiled read can actually execute) if left unguarded.
let sink = 0;
function touch(value: unknown): void {
  if (typeof value === 'number') sink += value;
  else if (typeof value === 'string') sink += value.length;
  else if (Array.isArray(value)) sink += value.length;
  else if (value != null) sink += 1;
}

// Calibrates to a target batch duration rather than timing single raw calls, seeding from this same N's previous batch so `repeat` converges without climbing from 1.
async function calibratedPerCallMs(
  runner: Runner,
  n: number,
  deadline: number,
  seedPerCallMs?: number
): Promise<number> {
  if (runner.warmup) {
    for (let i = 0; i < WARMUP_CALLS; i++) runner.call(runner.prepareInput(n));
  }
  let repeat =
    seedPerCallMs && seedPerCallMs > 0
      ? Math.min(
          MAX_REPEAT,
          Math.max(1, Math.round(BATCH_FLOOR_MS / seedPerCallMs))
        )
      : 1;
  for (;;) {
    // Pool bounded independently of `repeat` and cycled via modulo: fresh-per-call inputs matter for mutation safety, but an unbounded pool at high `repeat` creates enough GC pressure to leak into the timed region itself, which can make a genuinely O(1) function appear to grow with N.
    const poolSize = Math.min(repeat, INPUT_POOL_SIZE);
    const pool = Array.from({ length: poolSize }, () => runner.prepareInput(n));
    const start = performance.now();
    for (let i = 0; i < repeat; i++) {
      const input = pool[i % poolSize];
      const result = runner.call(input);
      touch(result);
      runner.cleanupResult?.(result);
    }
    const elapsed = performance.now() - start;
    // Pool cleanup happens after timing, once per pool (not per call); each item may have been reused.
    for (const input of pool) runner.cleanupInput?.(input);
    if (
      elapsed >= BATCH_FLOOR_MS ||
      repeat >= MAX_REPEAT ||
      performance.now() >= deadline
    ) {
      return elapsed / repeat;
    }
    if (elapsed <= 0) {
      // A literal zero reading is a clock-resolution artifact rather than evidence of speed, so grow by a bounded multiplier instead of dividing by it.
      repeat = Math.min(MAX_REPEAT, repeat * 1000);
    } else {
      // Jump straight to the repeat count the observed rate says would hit the floor, which always makes forward progress since elapsed is below BATCH_FLOOR_MS.
      const observedPerCall = elapsed / repeat;
      repeat = Math.min(
        MAX_REPEAT,
        Math.ceil(BATCH_FLOOR_MS / Math.max(observedPerCall, EPS))
      );
    }
  }
}

async function measureAtN(
  runner: Runner,
  n: number,
  deadline: number
): Promise<number> {
  const estimates: number[] = [];
  let seed: number | undefined;
  for (;;) {
    const estimate = await calibratedPerCallMs(runner, n, deadline, seed);
    estimates.push(estimate);
    seed = estimate; // later batches at this N seed from the previous batch's own estimate; usually near-exact, converges in one calibration step
    const settled = estimates.slice(1); // first batch is extra warmup, excluded from both the stability check and the final result
    const stable =
      settled.length >= MIN_BATCHES_PER_N &&
      relativeSpread(settled) <= STABILITY_CV;
    // Already at "too slow, stop escalating N" territory (see runBenchmark); no point spending up to MAX_BATCHES_PER_N more batches chasing stability for a value that's about to halt the run anyway.
    const alreadyTooSlow = estimate >= PER_CALL_STOP_MS;
    if (
      stable ||
      alreadyTooSlow ||
      estimates.length >= MAX_BATCHES_PER_N ||
      performance.now() >= deadline
    ) {
      break;
    }
  }
  const settled = estimates.length > 1 ? estimates.slice(1) : estimates; // never discard the only sample we have
  return median(settled);
}

// Caps a single step's predicted cost jump from the locally observed growth, since a jump onto a catastrophically expensive N can't be interrupted once a synchronous call starts.
const MAX_STEP_COST_MULTIPLIER = 20;
function nextN(history: { n: number; timeMs: number }[]): number {
  const last = history[history.length - 1]!;
  const geometricNext = Math.max(last.n + 1, Math.round(last.n * 1.6));
  const prior = history[history.length - 2];
  if (!prior || last.timeMs <= prior.timeMs || last.n <= prior.n) {
    return geometricNext;
  }
  const logGrowthPerN =
    Math.log(last.timeMs / prior.timeMs) / (last.n - prior.n);
  const maxSafeDelta = Math.log(MAX_STEP_COST_MULTIPLIER) / logGrowthPerN;
  const safeNext = last.n + Math.max(1, Math.floor(maxSafeDelta));
  return Math.min(geometricNext, safeNext);
}

// --- Orchestration ---------------------------------------------------------

// A pasted-code syntax error surfaces as a raw engine message (e.g. "Unexpected token ')'"); this just names what went wrong before showing it, since "SyntaxError" alone isn't obviously about the pasted code to a reader.
function friendlyExtractionError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return err instanceof SyntaxError
    ? `Your code couldn't be parsed. Check for typos or missing brackets.\n\n${raw}`
    : raw;
}

// Python tracebacks are several lines of internal call-stack framing before the actual exception; only the last line is ever meaningful to a reader here, since every call originates from the same worker-internal wrapper.
function simplifyPythonTraceback(raw: string): string {
  const lines = raw
    .trim()
    .split('\n')
    .filter((l) => l.trim().length > 0);
  const last = lines[lines.length - 1];
  return last && /Error:/.test(last) ? last : raw;
}

// Plain-English guesses at the most common cause behind a handful of very common, very unhelpful-on-their-own runtime error shapes, all of which are, in practice, almost always a mismatch between the selected input type and what the pasted function actually does with it.
function mismatchHint(message: string, language: Language): string | null {
  if (language === 'javascript') {
    if (/is not a function/.test(message)) {
      return "the value passed in doesn't have that method, likely because the input type below doesn't match what your function expects.";
    }
    if (/Cannot read propert(?:y|ies) of undefined/.test(message)) {
      return 'your function expected an object or array but received something else.';
    }
    if (/is not iterable/.test(message)) {
      return "your function tried to loop over a value that isn't an array or string.";
    }
    if (/Cannot assign to read only property/.test(message)) {
      return 'your function tried to modify a string in place; strings are immutable in JavaScript.';
    }
    if (/Maximum call stack size exceeded/.test(message)) {
      return 'your function recurses too deeply even for a small input; check its base case.';
    }
  } else {
    if (/is not iterable/.test(message)) {
      return 'your function expected a list or string but received a number.';
    }
    if (/has no len\(\)/.test(message)) {
      return 'your function called len() on a value that has no length.';
    }
    if (/is not subscriptable/.test(message)) {
      return "your function tried to index into a value that doesn't support it.";
    }
    if (/maximum recursion depth exceeded/.test(message)) {
      return 'your function recurses too deeply even for a small input; check its base case.';
    }
  }
  return null;
}

// Names the most common failure mode explicitly, a selected input type that doesn't match what the pasted function does with its argument.
function friendlyRunError(err: unknown, req: RunRequest): string {
  const raw = err instanceof Error ? err.message : String(err);
  const message =
    req.language === 'python' ? simplifyPythonTraceback(raw) : raw;
  const inputLabel =
    INPUT_GENERATOR_OPTIONS.find((o) => o.id === req.inputGenerator)?.label ??
    req.inputGenerator;
  const hint = mismatchHint(message, req.language);
  const guidance = hint
    ? `This usually means ${hint}`
    : 'If your function expects a different kind of input, change "Input your function receives" above and run again.';
  return `Your function raised an error when called with "${inputLabel}" input. ${guidance}\n\n${message}`;
}

async function runBenchmark(req: RunRequest): Promise<void> {
  let runner: Runner;
  try {
    if (req.language === 'javascript') {
      runner = makeJsRunner(
        extractJsFunction(req.source, req.entryName),
        req.inputGenerator
      );
    } else {
      const pyodide = await getPyodide();
      runner = makePyRunner(
        pyodide,
        extractPyFunction(pyodide, req.source, req.entryName),
        req.inputGenerator
      );
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: friendlyExtractionError(err),
    } satisfies ErrorMessage);
    return;
  }

  sink = 0; // fresh accumulator per run; see touch()'s doc comment
  const measurements: { n: number; timeMs: number }[] = [];
  const startedAt = performance.now();
  const deadline = startedAt + TOTAL_BUDGET_MS;
  const hardDeadline = startedAt + HARD_DEADLINE_MS;
  let n = 8;
  let stoppedEarly = false;

  for (;;) {
    let perCallMs: number;
    try {
      // No cross-N seed, since per-call cost can jump orders of magnitude between adjacent N steps for accelerating functions.
      perCallMs = await measureAtN(runner, n, deadline);
    } catch (err) {
      // A function that only throws at larger N (e.g. stack overflow on deep recursion) is a natural stopping point once we already have enough data, not a failure of the whole run.
      if (measurements.length >= MIN_DATA_POINTS) break;
      self.postMessage({
        type: 'error',
        message: friendlyRunError(err, req),
      } satisfies ErrorMessage);
      return;
    }

    // Tiny deterministic per-point nudge (orders of magnitude below MIN_MEASURABLE_MS, so it can't affect the fit) so two clamped points never land on the exact same value; recharts warns about duplicate tick keys otherwise.
    const floored = Math.max(
      perCallMs,
      MIN_MEASURABLE_MS * (1 + measurements.length * 1e-6)
    );
    measurements.push({ n, timeMs: floored });
    self.postMessage({
      type: 'progress',
      n,
      timeMs: floored,
      done: measurements.length,
      total: PROGRESS_TOTAL_ESTIMATE,
    } satisfies ProgressMessage);

    const overBudget = performance.now() >= deadline;
    const overHardDeadline = performance.now() >= hardDeadline;
    const tooSlow = perCallMs >= PER_CALL_STOP_MS;
    // tooSlow waits only for HARD_MIN_DATA_POINTS, since a call already past PER_CALL_STOP_MS means the next N could cost many times more.
    if (
      overHardDeadline ||
      (tooSlow && measurements.length >= HARD_MIN_DATA_POINTS) ||
      (overBudget && measurements.length >= MIN_DATA_POINTS)
    ) {
      stoppedEarly = overBudget || overHardDeadline;
      break;
    }
    n = nextN(measurements);
  }

  self.postMessage({
    type: 'result',
    measurements,
    stoppedEarly,
    checksum: sink,
  } satisfies ResultMessage);
}

self.onmessage = (e: MessageEvent<RunRequest>): void => {
  if (e.data.type === 'run') void runBenchmark(e.data);
};
