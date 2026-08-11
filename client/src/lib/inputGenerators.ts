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

const STRING_PARAM_NAMES = /^(s|str|string|text|word|chars?)$/;
const NUMBER_PARAM_NAMES = /^(n|num|number|x|k|count|size)$/;
const ARRAY_PARAM_NAMES = /^(arr|array|nums|list|lst|a|xs|data|items|values)$/;

const STRING_SYNTAX: Record<'javascript' | 'python', RegExp> = {
  javascript:
    /\.charAt\(|\.charCodeAt\(|\.toUpperCase\(|\.toLowerCase\(|\.padStart\(|\.padEnd\(|\.split\(/,
  python: /\.upper\(\)|\.lower\(\)|\.isalpha\(|\.isdigit\(|\.isspace\(/,
};
const ARRAY_SYNTAX: Record<'javascript' | 'python', RegExp> = {
  javascript:
    /\.length\b|\.slice\(|\.sort\(|\.map\(|\.filter\(|\.forEach\(|\.reduce\(|\.push\(|\.pop\(|\[\s*\w|\bfor\s*\(\s*(?:const|let|var)\s+\w+\s+of\b/,
  python: /\blen\(|\.sort\(|\.append\(|\.pop\(|\[\s*\w|\bfor\s+\w+\s+in\b/,
};

function extractFirstParamName(
  source: string,
  language: 'javascript' | 'python'
): string {
  const match =
    language === 'python'
      ? source.match(/def\s+\w+\s*\(\s*(\w+)/)
      : (source.match(/function\s+\w+\s*\(\s*(\w+)/) ??
        source.match(/\(\s*(\w+)\s*\)\s*=>/));
  return match?.[1]?.toLowerCase() ?? '';
}

// Best-effort guess at which input shape a pasted function expects, from conventional parameter naming first and surface syntax second — used only to suggest (never force) a matching selection, since a mismatched input type is the single most common cause of an immediate run error. Never returns 'sortedArray': sortedness can't be inferred from syntax and doesn't affect crash risk either way — see isSameInputShape.
export function detectInputGenerator(
  source: string,
  language: 'javascript' | 'python'
): InputGeneratorId {
  const paramName = extractFirstParamName(source, language);
  if (STRING_PARAM_NAMES.test(paramName)) return 'randomString';
  if (NUMBER_PARAM_NAMES.test(paramName)) return 'number';
  if (ARRAY_PARAM_NAMES.test(paramName)) return 'randomArray';
  if (STRING_SYNTAX[language].test(source)) return 'randomString';
  if (ARRAY_SYNTAX[language].test(source)) return 'randomArray';
  return 'number';
}

// 'randomArray' and 'sortedArray' both produce a number[] and are interchangeable for crash-avoidance purposes (sortedness only affects whether the *measured complexity* is meaningful for sort-dependent code, e.g. binary search — never whether the call throws) — so they should never trigger a mismatch warning against each other.
export function isSameInputShape(
  a: InputGeneratorId,
  b: InputGeneratorId
): boolean {
  const arrayLike: InputGeneratorId[] = ['randomArray', 'sortedArray'];
  return a === b || (arrayLike.includes(a) && arrayLike.includes(b));
}

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
