// Remembers layout shape only — item counts and section order, never the payload — so a returning visitor's skeleton matches what replaces it.

const KEY = 'portfolio:layout-hints';

interface Hints {
  counts: Record<string, number>;
  order: Record<string, string[]>;
}

const empty = (): Hints => ({ counts: {}, order: {} });

const read = (): Hints => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<Hints>;
    return {
      counts: parsed.counts ?? {},
      order: parsed.order ?? {},
    };
  } catch {
    return empty();
  }
};

// Held in memory so reads during render never touch synchronous storage more than once per session.
let hints: Hints | null = null;

const state = (): Hints => (hints ??= read());

let flushHandle: ReturnType<typeof setTimeout> | null = null;

// Batched: one paint can settle a dozen queries, and each must not trigger its own synchronous write.
const flush = (): void => {
  flushHandle = null;
  try {
    localStorage.setItem(KEY, JSON.stringify(state()));
  } catch {
    // Private browsing / quota — hints are an optimisation, never a requirement.
  }
};

const schedule = (): void => {
  if (flushHandle === null) flushHandle = setTimeout(flush, 500);
};

/** Last-known item count for a list, or `undefined` on a first-ever visit. */
export const getCount = (key: string): number | undefined => {
  const n = state().counts[key];
  return typeof n === 'number' ? n : undefined;
};

export const rememberCount = (key: string, count: number): void => {
  const s = state();
  if (s.counts[key] === count) return;
  // Capped so a 200-row list can never ask for 200 skeletons on the next visit.
  s.counts[key] = Math.max(0, Math.min(count, 24));
  schedule();
};

/** Last-known section order, used to lay out placeholders before the settings query resolves. */
export const getOrder = (key: string): string[] | undefined =>
  state().order[key];

export const rememberOrder = (key: string, order: string[]): void => {
  const s = state();
  const prev = s.order[key];
  if (
    prev &&
    prev.length === order.length &&
    prev.every((v, i) => v === order[i])
  )
    return;
  s.order[key] = order;
  schedule();
};
