import { generateInput, type InputGeneratorId } from '@/lib/inputGenerators';
import type {
  RunRequest,
  ProgressMessage,
  ResultMessage,
  ErrorMessage,
} from './bigoBenchmark.types';

// Pyodide has no published types for this CDN-loaded, version-pinned path — treated as an opaque handle the few call sites below cast at the point of use, rather than fighting for types across a library we don't control.
type PyodideInterface = {
  runPython: (code: string) => unknown;
  globals: { get: (name: string) => unknown };
  toPy: (value: unknown) => unknown;
};

// Verified current via `npm view pyodide version` — re-check at upgrade time, the CDN path is version-pinned.
const PYODIDE_VERSION = '314.0.3';

const WARMUP_CALLS = 3;
const BATCH_FLOOR_MS = 50;
// Ceiling on calibration growth — kept high since the timed loop itself is cheap (pool-bounded, no extra allocation) and `deadline` is still checked every growth step regardless; confirmed live that a low cap here just starves fast functions of measurable resolution instead of saving time.
const MAX_REPEAT = 2_000_000;
// Bounds allocation/GC volume per calibration step independently of `repeat` — see calibratedPerCallMs.
const INPUT_POOL_SIZE = 256;
// Adaptive batch count per N: at least this many post-warmup batches before stability is even considered.
const MIN_BATCHES_PER_N = 3;
// ...and never more than this many, however noisy — bounds worst-case time the same way the old fixed count did.
const MAX_BATCHES_PER_N = 8;
// Stop collecting batches once their spread (MAD/median — robust to a single outlier batch) falls at or below this fraction — stable functions finish in fewer batches than the old fixed 5, noisy ones get more.
const STABILITY_CV = 0.08;
const PER_CALL_STOP_MS = 500;
const TOTAL_BUDGET_MS = 12_000;
// Absolute backstop, comfortably under the main thread's watchdog termination — always cooperatively stop by here even if MIN_DATA_POINTS below was never reached. Needed because superlinear functions can keep costing many times more per N step; without this, chasing MIN_DATA_POINTS could otherwise escalate N well past what's safe to even attempt once.
const HARD_DEADLINE_MS = 16_000;
const MIN_DATA_POINTS = 8;
// The classifier's own MIN_MEASUREMENTS floor — below this a fit can't even be attempted, so a too-slow function is still allowed to push one step further (bounded by HARD_DEADLINE_MS regardless) to try to clear it.
const HARD_MIN_DATA_POINTS = 4;
// Guards only against a literal exact-0 reading (breaks log-scale charting and the O(2^n) candidate's log-response fit) — kept far below any real measurement, since the calibration loop above already targets BATCH_FLOOR_MS per batch and genuinely resolves down to single-digit-nanosecond (0.00001ms-scale) per-call costs for cheap operations; a coarser floor here would clip that real signal instead of just catching the zero case.
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

// Median absolute deviation normalized by the median — a coefficient-of-variation analog that (unlike stdev/mean) a single outlier batch can't blow up.
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

// Two-attempt extraction: (1) whole snippet as a single expression, so a named function expression like `(function fib(n){...})` still self-binds `fib` for recursion; (2) if that's a syntax error (e.g. `const fib = (n) => ...` is a statement, not an expression), run it as a program and pull out a named top-level binding instead — `new Function` only closes over the global scope, a documented constraint, not a bug.
function extractJsFunction(
  source: string,
  entryName?: string
): (input: unknown) => unknown {
  try {
    const fn = new Function(`"use strict"; return (${source}\n);`)();
    if (typeof fn === 'function') return fn as (input: unknown) => unknown;
  } catch {
    // Not a single expression — fall through to the whole-program attempt.
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
  return pyodideLoadPromise;
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
  pyodide.runPython(source); // once — re-running per trial would make parse time dominate every measurement
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
  /** Destroys a PyProxy result — Python only, called after *every* call (each result is a fresh object). */
  cleanupResult?: (result: unknown) => void;
  /** Destroys a PyProxy input — Python only, called *once per pool item* after the pool is done being cycled through, not per-call (an input can be reused across many calls; destroying it after its first use would leave later reuses operating on freed WASM memory — confirmed live, this hung the whole run). */
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
    // Marshalled to a Python object here, outside the timed region — converting inside the timed loop would measure JS<->Python FFI cost, not the algorithm.
    prepareInput: (n) => pyodide.toPy(generateInput(inputGenerator, n)),
    call: fn,
    cleanupResult: destroy,
    cleanupInput: destroy,
    warmup: false,
  };
}

// Folded into every call's return value and read once at the end of a run — a result nobody reads is exactly what V8 can prove is dead and eliminate; confirmed live `return arr[0]` measured 3-7ns/call (faster than a JIT-compiled read can execute) before this fix.
let sink = 0;
function touch(value: unknown): void {
  if (typeof value === 'number') sink += value;
  else if (typeof value === 'string') sink += value.length;
  else if (Array.isArray(value)) sink += value.length;
  else if (value != null) sink += 1;
}

// Calibrates to a target batch duration (like timeit.autorange()/Tinybench) instead of timing single raw calls, since browsers clamp/jitter performance.now() resolution right where the fit most needs reliable small-N data; `deadline` is checked every growth step so one ultra-fast function's calibration can't itself run past budget. `seedPerCallMs` (this same N's previous batch, when available — deliberately never a different N, see measureAtN) skips straight to a plausible `repeat` instead of climbing from 1; safe even when off, since the growth step below still self-corrects from the observed rate.
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
    // Pool bounded independently of `repeat` and cycled via modulo: fresh-per-call inputs matter for mutation safety, but an unbounded pool at high `repeat` creates enough GC pressure to leak into the timed region itself — confirmed live, this made a genuinely O(1) function appear to grow with N.
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
    // Pool cleanup happens after timing, once per pool (not per call) — each item may have been reused.
    for (const input of pool) runner.cleanupInput?.(input);
    if (
      elapsed >= BATCH_FLOOR_MS ||
      repeat >= MAX_REPEAT ||
      performance.now() >= deadline
    ) {
      return elapsed / repeat;
    }
    if (elapsed <= 0) {
      // A literal zero reading is a clock-resolution artifact (single-digit-microsecond batches can round down to 0), not evidence the call is astronomically fast — dividing by it would leap straight to MAX_REPEAT off one unreliable sample. Confirmed live: this produced literal-zero measurements sandwiched between correctly-scaled neighbors, corrupting the fit. Grow by a large-but-bounded multiplier instead, so the next attempt gets a real, non-clamped reading to compute from.
      repeat = Math.min(MAX_REPEAT, repeat * 1000);
    } else {
      // Jump straight to the repeat count the observed rate says would hit the floor, instead of blindly doubling — converges in one extra step even when the seed above was off. No separate multiplicative floor needed: elapsed < BATCH_FLOOR_MS (or we'd already have returned above) algebraically guarantees BATCH_FLOOR_MS/observedPerCall > repeat, so this always makes forward progress on its own.
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
    seed = estimate; // later batches at this N seed from the previous batch's own estimate — usually near-exact, converges in one calibration step
    const settled = estimates.slice(1); // first batch is extra warmup, excluded from both the stability check and the final result
    const stable =
      settled.length >= MIN_BATCHES_PER_N &&
      relativeSpread(settled) <= STABILITY_CV;
    // Already at "too slow, stop escalating N" territory (see runBenchmark) — no point spending up to MAX_BATCHES_PER_N more batches chasing stability for a value that's about to halt the run anyway; that's exactly what let already-expensive N steps compound into multi-second stalls.
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

// Growth ratio backs off from 1.6x to 1.2x once cost is already a meaningful fraction of PER_CALL_STOP_MS — a superlinear function's cost multiplies by growthRatio^degree per N step (e.g. 1.6^3 ≈ 4.1x for a cubic one), so a single geometric jump taken while already close to the stop threshold could land multiple seconds past it before the next tooSlow check ever runs; the gentler ratio keeps that jump bounded (1.2^3 ≈ 1.7x) so the threshold is approached, not overshot.
const NEXT_N_BACKOFF_THRESHOLD = PER_CALL_STOP_MS * 0.2;
const nextN = (prev: number, lastPerCallMs: number): number => {
  const ratio = lastPerCallMs >= NEXT_N_BACKOFF_THRESHOLD ? 1.2 : 1.6;
  return Math.max(prev + 1, Math.round(prev * ratio));
};

// --- Orchestration ---------------------------------------------------------

function postError(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  self.postMessage({ type: 'error', message } satisfies ErrorMessage);
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
    postError(err);
    return;
  }

  sink = 0; // fresh accumulator per run — see touch()'s doc comment
  const measurements: { n: number; timeMs: number }[] = [];
  const startedAt = performance.now();
  const deadline = startedAt + TOTAL_BUDGET_MS;
  const hardDeadline = startedAt + HARD_DEADLINE_MS;
  let n = 8;
  let stoppedEarly = false;

  for (;;) {
    let perCallMs: number;
    try {
      // No cross-N seed: per-call cost can jump by orders of magnitude between adjacent N steps for accelerating functions (O(2^n) especially), and a seed based on a much-cheaper previous N would pick far too large a `repeat` for the new one. measureAtN still seeds *within* itself, batch-to-batch at this same N, where cost is stable by construction.
      perCallMs = await measureAtN(runner, n, deadline);
    } catch (err) {
      // A function that only throws at larger N (e.g. stack overflow on deep recursion) is a natural stopping point once we already have enough data, not a failure of the whole run.
      if (measurements.length >= MIN_DATA_POINTS) break;
      postError(err);
      return;
    }

    // Tiny deterministic per-point nudge (orders of magnitude below MIN_MEASURABLE_MS, so it can't affect the fit) so two clamped points never land on the exact same value — recharts warns about duplicate tick keys otherwise.
    const floored = Math.max(
      perCallMs,
      MIN_MEASURABLE_MS * (1 + measurements.length * 1e-6)
    );
    measurements.push({ n, timeMs: floored });
    self.postMessage({
      type: 'progress',
      n,
      done: measurements.length,
      total: PROGRESS_TOTAL_ESTIMATE,
    } satisfies ProgressMessage);

    const overBudget = performance.now() >= deadline;
    const overHardDeadline = performance.now() >= hardDeadline;
    const tooSlow = perCallMs >= PER_CALL_STOP_MS;
    // tooSlow only waits for HARD_MIN_DATA_POINTS (the classifier's own bare minimum), not the full MIN_DATA_POINTS target: a call already at or above PER_CALL_STOP_MS means the *next*, larger N could cost many times more for anything superlinear, so chasing a fuller point count by pushing further is exactly the runaway this guards against. The hard deadline is a last-resort, always-unconditional backstop regardless of point count.
    if (
      overHardDeadline ||
      (tooSlow && measurements.length >= HARD_MIN_DATA_POINTS) ||
      (overBudget && measurements.length >= MIN_DATA_POINTS)
    ) {
      stoppedEarly = overBudget || overHardDeadline;
      break;
    }
    n = nextN(n, perCallMs);
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
