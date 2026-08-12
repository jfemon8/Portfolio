import type {
  RegexRequest,
  RegexWorkerMessage,
  RegexMatch,
} from './regexMatch.types';

function post(message: RegexWorkerMessage): void {
  (self as unknown as Worker).postMessage(message);
}

type IndexedMatch = RegExpMatchArray & {
  indices?: (readonly [number, number] | undefined)[];
};

// Matching runs here so a catastrophically backtracking pattern burns a worker the page can terminate, never the UI thread.
self.onmessage = (event: MessageEvent<RegexRequest>) => {
  const { type, pattern, flags, text, limit } = event.data;
  if (type !== 'match') return;

  try {
    // matchAll needs 'g'; per-group offsets need 'd' — both added transparently regardless of what the user typed.
    let f = flags;
    if (!f.includes('g')) f += 'g';
    if (!f.includes('d')) f += 'd';
    const re = new RegExp(pattern, f);

    const matches: RegexMatch[] = [];
    let truncated = false;
    for (const raw of text.matchAll(re) as Iterable<IndexedMatch>) {
      if (matches.length >= limit) {
        truncated = true;
        break;
      }
      matches.push({
        text: raw[0],
        index: raw.index ?? 0,
        groupCount: Math.max(0, raw.length - 1),
        indices: (raw.indices ?? []).map((span) =>
          span ? [span[0], span[1]] : null
        ),
      });
    }
    post({ type: 'result', matches, truncated });
  } catch (err) {
    post({
      type: 'error',
      message:
        err instanceof Error ? err.message : 'Invalid regular expression.',
    });
  }
};
