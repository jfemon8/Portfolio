// Message contract shared between the worker and the UI thread — kept in its own file, free of any `self`/WebWorker-global-dependent code, so it type-checks identically whichever tsconfig (main app vs worker-scoped) transitively pulls it in.

export interface BenchmarkRequest {
  type: 'benchmark';
}

export interface BenchmarkResultMessage {
  type: 'result';
  hashesPerSecond: number;
}
