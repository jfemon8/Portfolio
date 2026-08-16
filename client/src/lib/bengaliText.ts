/** PDFs store Bengali in painted order, so a pre-base vowel sign arrives before its consonant; this restores the typed order. */

/** Only for pdf.js text extraction: OCR already emits logical order, and running this over it moves every matra one cluster too far. */

/** Vowel signs that render to the left of the cluster they belong to. */
const PRE_BASE = new Set(['ি', 'ে', 'ৈ']);
const NUKTA = '়';
const HALANT = '্';

/** Two-part signs arrive split around the consonant and must be rejoined. */
const REJOIN: Record<string, string> = {
  'ো': 'ো',
  'ৌ': 'ৌ',
};

const isConsonant = (ch: string): boolean => {
  const code = ch.codePointAt(0) ?? 0;
  return (
    (code >= 0x0995 && code <= 0x09b9) ||
    (code >= 0x09dc && code <= 0x09df) ||
    code === 0x09ce ||
    code === 0x09f0 ||
    code === 0x09f1
  );
};

const hasBengali = (value: string): boolean => /[ঀ-৿]/.test(value);

export const containsBengali = hasBengali;

/** Consumes one consonant cluster: consonant, nukta, and any halant-joined pairs. */
function clusterEnd(chars: string[], start: number): number {
  let i = start;
  if (!isConsonant(chars[i] ?? '')) return start;
  i += 1;
  if (chars[i] === NUKTA) i += 1;
  while (chars[i] === HALANT && isConsonant(chars[i + 1] ?? '')) {
    i += 2;
    if (chars[i] === NUKTA) i += 1;
  }
  return i;
}

export function fixBengaliVisualOrder(text: string): string {
  if (!hasBengali(text)) return text;

  const chars = [...text];
  const out: string[] = [];
  let i = 0;

  while (i < chars.length) {
    const ch = chars[i] as string;
    if (PRE_BASE.has(ch)) {
      const end = clusterEnd(chars, i + 1);
      if (end > i + 1) {
        // The cluster leads, then the sign that was painted before it.
        out.push(...chars.slice(i + 1, end), ch);
        i = end;
        continue;
      }
    }
    out.push(ch);
    i += 1;
  }

  let result = out.join('');
  for (const [split, joined] of Object.entries(REJOIN))
    result = result.replaceAll(split, joined);
  return result;
}
