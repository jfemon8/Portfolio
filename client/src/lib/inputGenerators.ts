// Shared between the UI (dropdown labels) and the worker (actual generation) — single source of truth so the two can never drift out of sync.

export type InputGeneratorId =
  | 'number'
  | 'randomArray'
  | 'sortedArray'
  | 'randomString';

export interface InputGeneratorOption {
  id: InputGeneratorId;
  label: string;
  /** Shown next to the code editor so the pasted function's expected signature is unambiguous. */
  signatureHint: string;
}

export const INPUT_GENERATOR_OPTIONS: InputGeneratorOption[] = [
  { id: 'number', label: 'A plain number N', signatureHint: 'fn(n)' },
  {
    id: 'randomArray',
    label: 'Array of N random integers',
    signatureHint: 'fn(arr)',
  },
  {
    id: 'sortedArray',
    label: 'Array of N random integers (pre-sorted)',
    signatureHint: 'fn(arr)',
  },
  {
    id: 'randomString',
    label: 'Random string of length N',
    signatureHint: 'fn(str)',
  },
];

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

/** Produces one fresh input of size `n`. Called once per benchmark call (never reused across calls in a timed batch — see the worker's mutation-safety handling). */
export function generateInput(
  id: InputGeneratorId,
  n: number
): number | number[] | string {
  switch (id) {
    case 'number':
      return n;
    case 'randomArray':
      return Array.from({ length: n }, () =>
        Math.floor(Math.random() * n * 10)
      );
    case 'sortedArray':
      return Array.from({ length: n }, () =>
        Math.floor(Math.random() * n * 10)
      ).sort((a, b) => a - b);
    case 'randomString': {
      let s = '';
      for (let i = 0; i < n; i++) {
        s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
      return s;
    }
  }
}
