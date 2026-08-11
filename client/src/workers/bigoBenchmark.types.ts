// Message contract shared between the worker and the UI thread — kept in its own file, free of any `self`/WebWorker-global-dependent code, so it type-checks identically whichever tsconfig (main app vs worker-scoped) transitively pulls it in.
import type { InputGeneratorId } from '@/lib/inputGenerators';

export type Language = 'javascript' | 'python';

export interface RunRequest {
  type: 'run';
  language: Language;
  source: string;
  entryName?: string;
  inputGenerator: InputGeneratorId;
}

export interface ProgressMessage {
  type: 'progress';
  n: number;
  /** The measurement that just completed at this N — lets the UI plot and re-fit live as the run progresses, instead of only once at the very end. */
  timeMs: number;
  done: number;
  total: number;
}

export interface ResultMessage {
  type: 'result';
  measurements: { n: number; timeMs: number }[];
  stoppedEarly: boolean;
  /** Accumulated fold of every call's return value — not shown in the UI. Its only purpose is forcing a genuine data-flow dependency from each timed call out to postMessage, so the JIT can't prove the call's result is unused and dead-code-eliminate it entirely. */
  checksum: number;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}
