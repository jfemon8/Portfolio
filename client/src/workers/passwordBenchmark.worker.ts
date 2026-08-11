import type {
  BenchmarkRequest,
  BenchmarkResultMessage,
} from './passwordBenchmark.types';

const BATCH_FLOOR_MS = 150;
// Bounds worst-case in-flight promise count for one batch — SHA-256 via WebCrypto realistically tops out in the tens-of-thousands-per-second range for tiny inputs once async dispatch overhead is included, so this is a generous but not unbounded ceiling.
const MAX_CONCURRENCY = 50_000;
const BATCHES = 5;
const EPS = 1e-9;

// Content is irrelevant — this benchmarks raw hashing throughput, not anything about the sample itself. Fixed size, generated once, reused across every call.
const sampleData = crypto.getRandomValues(new Uint8Array(32));

async function runBatch(concurrency: number): Promise<number> {
  const start = performance.now();
  const jobs: Promise<ArrayBuffer>[] = [];
  for (let i = 0; i < concurrency; i++) {
    jobs.push(crypto.subtle.digest('SHA-256', sampleData));
  }
  await Promise.all(jobs);
  return performance.now() - start;
}

// Same calibrate-to-a-target-duration approach as the Big-O Benchmark worker: grow concurrency toward whatever the observed rate says would hit the floor, rather than blind doubling. elapsedMs < BATCH_FLOOR_MS (or we'd already have returned) algebraically guarantees the computed target exceeds the current concurrency, so this always makes forward progress on its own.
async function calibratedHashesPerSecond(): Promise<number> {
  let concurrency = 64;
  for (;;) {
    const elapsedMs = await runBatch(concurrency);
    if (elapsedMs >= BATCH_FLOOR_MS || concurrency >= MAX_CONCURRENCY) {
      return concurrency / (elapsedMs / 1000);
    }
    const target = Math.ceil(
      (BATCH_FLOOR_MS * concurrency) / Math.max(elapsedMs, EPS)
    );
    concurrency = Math.min(MAX_CONCURRENCY, Math.max(concurrency + 1, target));
  }
}

self.onmessage = async (e: MessageEvent<BenchmarkRequest>): Promise<void> => {
  if (e.data.type !== 'benchmark') return;
  const rates: number[] = [];
  for (let i = 0; i < BATCHES; i++) {
    rates.push(await calibratedHashesPerSecond());
  }
  // Median, not mean — a single scheduling hiccup (another tab, a GC pause) shouldn't skew the one number this tool reports.
  rates.sort((a, b) => a - b);
  const hashesPerSecond = rates[Math.floor(rates.length / 2)]!;
  self.postMessage({
    type: 'result',
    hashesPerSecond,
  } satisfies BenchmarkResultMessage);
};
