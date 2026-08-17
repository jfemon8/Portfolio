import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import AutoTextarea from '@/components/shared/AutoTextarea';
import { cn } from '@/lib/cn';
import type {
  RegexMatch,
  RegexRequest,
  RegexWorkerMessage,
} from '@/workers/regexMatch.types';

const MAX_MATCHES = 2000;
const MAX_LISTED_MATCHES = 200;
const WATCHDOG_MS = 2000;
const DEBOUNCE_MS = 250;

interface MatchState {
  matches: RegexMatch[];
  truncated: boolean;
  error: string | null;
}

interface Segment {
  text: string;
  /** null = unmatched · 0 = matched but outside any capturing group · N = inside capture group N */
  groupIndex: number | null;
}

const GROUP_COLORS = [
  'bg-primary/30 text-primary',
  'bg-neon/25 text-neon',
  'bg-neon-blue/25 text-neon-blue',
  'bg-neon-violet/25 text-neon-violet',
  'bg-neon-pink/25 text-neon-pink',
  'bg-neon-dim/25 text-neon-dim',
];

const PRESETS = [
  {
    label: 'Email',
    pattern: '[\\w.+-]+@[\\w-]+\\.[a-zA-Z]{2,}',
    flags: 'g',
    sample: 'Contact us at jfemon8@gmail.com or jfemon8@yahoo.com',
  },
  {
    label: 'URL',
    pattern: 'https?:\\/\\/[^\\s]+',
    flags: 'g',
    sample: 'Visit https://jfemon.vercel.app/ or https://jfemon.pro.bd/',
  },
  {
    label: 'IPv4 address',
    pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b',
    flags: 'g',
    sample: 'Server at 192.168.1.1, backup at 10.0.0.254',
  },
  {
    label: 'Hex color',
    pattern: '#[0-9a-fA-F]{3,6}\\b',
    flags: 'g',
    sample: 'Brand colors: #00ffd1, #a855f7, and #fff',
  },
  {
    label: 'Date (YYYY-MM-DD)',
    pattern: '(\\d{4})-(\\d{2})-(\\d{2})',
    flags: 'g',
    sample: 'Sprint runs 2000-11-13 through 2026-02-20',
  },
  {
    label: 'Phone (BD)',
    pattern: '\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}',
    flags: 'g',
    sample: 'Call (+880) 1735 626 822',
  },
];

// Splits each match into runs owned by whichever capturing group covers them (innermost/highest-numbered wins on overlap), so `(\d{4})-(\d{2})` highlights each group in a distinct color instead of one flat block — needs the 'd' flag for per-group character offsets.
function buildSegments(text: string, matches: RegexMatch[]): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const m of matches) {
    const indices = m.indices;
    if (m.text === '' || !indices[0]) continue;
    const [matchStart, matchEnd] = indices[0];
    if (matchStart > cursor) {
      segments.push({ text: text.slice(cursor, matchStart), groupIndex: null });
    }

    const len = matchEnd - matchStart;
    const owner = new Array<number>(len).fill(0);
    for (let g = 1; g < indices.length; g++) {
      const span = indices[g];
      if (!span) continue;
      const [gs, ge] = span;
      for (let p = Math.max(gs, matchStart); p < Math.min(ge, matchEnd); p++) {
        owner[p - matchStart] = g;
      }
    }
    let runStart = 0;
    for (let i = 1; i <= len; i++) {
      if (i === len || owner[i] !== owner[runStart]) {
        segments.push({
          text: text.slice(matchStart + runStart, matchStart + i),
          groupIndex: owner[runStart]!,
        });
        runStart = i;
      }
    }
    cursor = matchEnd;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), groupIndex: null });
  }
  return segments;
}

export default function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('gi');
  const [text, setText] = useState('');
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [running, setRunning] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPreset = (index: number): void => {
    const p = PRESETS[Number(index)];
    if (!p) return;
    setPattern(p.pattern);
    setFlags(p.flags);
    setText(p.sample);
  };

  // Debounced into a watchdogged worker — a backtracking pattern like `(a+)+$` used to freeze this tab for minutes.
  useEffect(() => {
    if (!pattern) {
      setMatchState(null);
      setRunning(false);
      return;
    }
    setRunning(true);
    const debounce = setTimeout(() => {
      workerRef.current ??= new Worker(
        new URL('../../workers/regexMatch.worker.ts', import.meta.url),
        { type: 'module' }
      );
      const worker = workerRef.current;

      watchdogRef.current = setTimeout(() => {
        worker.terminate();
        workerRef.current = null;
        setRunning(false);
        setMatchState({
          matches: [],
          truncated: false,
          error:
            'This pattern is taking too long on this input — it is probably backtracking catastrophically. Try making it less ambiguous (for example replace nested quantifiers like (a+)+ with a+).',
        });
      }, WATCHDOG_MS);

      worker.onmessage = (event: MessageEvent<RegexWorkerMessage>) => {
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
        setRunning(false);
        const msg = event.data;
        if (msg.type === 'result') {
          setMatchState({
            matches: msg.matches,
            truncated: msg.truncated,
            error: null,
          });
        } else {
          setMatchState({ matches: [], truncated: false, error: msg.message });
        }
      };

      worker.postMessage({
        type: 'match',
        pattern,
        flags,
        text,
        limit: MAX_MATCHES,
      } satisfies RegexRequest);
    }, DEBOUNCE_MS);

    // The watchdog outlives the debounce once a request is in flight; left running it kills the worker mid-answer and blames backtracking.
    return () => {
      clearTimeout(debounce);
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    };
  }, [pattern, flags, text]);

  useEffect(
    () => () => {
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      workerRef.current?.terminate();
    },
    []
  );

  const result = useMemo(() => {
    if (!matchState) return null;
    if (matchState.error) {
      return { segments: null, matches: null, error: matchState.error };
    }
    return {
      segments: buildSegments(text, matchState.matches),
      matches: matchState.matches,
      error: null as string | null,
    };
  }, [matchState, text]);

  // Reduced rather than spread — spreading 200k matches into Math.max throws a RangeError that escapes render and takes down the whole app.
  const groupCount = (result?.matches ?? []).reduce(
    (max, m) => Math.max(max, m.groupCount),
    0
  );

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between">
        <span className="label mb-0">Common patterns</span>
        <select
          className="input min-h-0 w-auto py-1 text-xs"
          defaultValue=""
          onChange={(e) => loadPreset(Number(e.target.value))}
        >
          <option value="" disabled>
            Load a preset…
          </option>
          {PRESETS.map((p, i) => (
            <option key={p.label} value={i}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label className="label" htmlFor="regex-pattern">
            Pattern
          </label>
          <div className="flex items-center gap-2">
            <span className="font-mono text-muted-foreground">/</span>
            <input
              id="regex-pattern"
              className="input font-mono text-sm"
              placeholder="\\d+"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            />
            <span className="font-mono text-muted-foreground">/</span>
          </div>
        </div>
        <div className="sm:w-32">
          <label className="label" htmlFor="regex-flags">
            Flags
          </label>
          <input
            id="regex-flags"
            className="input font-mono text-sm"
            placeholder="gi"
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
          />
        </div>
      </div>

      {result?.error && (
        <p className="mt-3 text-sm text-neon-pink">{result.error}</p>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className="label mb-0" htmlFor="regex-test-text">
            Test string
          </label>
          <button
            type="button"
            onClick={() => loadPreset(0)}
            className="flex items-center gap-1 text-2xs text-muted-foreground transition-colors hover:text-neon"
          >
            <Sparkles className="h-3.5 w-3.5" /> Load example
          </button>
        </div>
        <AutoTextarea
          id="regex-test-text"
          className="input mt-1.5 min-h-32 font-mono text-xs"
          placeholder="Paste text to test against…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      {result?.segments && text && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4"
        >
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="label mb-0">
              Highlighted matches ({result.matches?.length ?? 0})
              {running && (
                <span className="ml-2 normal-case text-muted-foreground/60">
                  matching…
                </span>
              )}
            </span>
            {groupCount > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {Array.from({ length: groupCount }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs',
                      GROUP_COLORS[(i + 1) % GROUP_COLORS.length]
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    Group {i + 1}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="glass-thin whitespace-pre-wrap break-words rounded-xl p-4 font-mono text-xs text-foreground">
            {result.segments.map((seg, i) => (
              <Fragment key={i}>
                {seg.groupIndex !== null ? (
                  <mark
                    className={cn(
                      'rounded px-0.5',
                      GROUP_COLORS[seg.groupIndex % GROUP_COLORS.length]
                    )}
                  >
                    {seg.text}
                  </mark>
                ) : (
                  seg.text
                )}
              </Fragment>
            ))}
          </div>
        </motion.div>
      )}

      {result?.matches && result.matches.length > 0 && (
        <div className="mt-4 space-y-2">
          <span className="label">Matches</span>
          {matchState?.truncated && (
            <p className="text-2xs text-amber-400">
              Showing the first {MAX_MATCHES.toLocaleString()} matches — the
              pattern matched more than that.
            </p>
          )}
          {result.matches.slice(0, MAX_LISTED_MATCHES).map((m, i) => (
            <div
              key={i}
              className="glass-thin rounded-lg p-3 font-mono text-2xs text-muted-foreground"
            >
              <span className="text-foreground">Match {i + 1}:</span> "{m.text}"
              {m.groupCount > 0 && (
                <span>
                  {' '}
                  — groups:{' '}
                  {m.indices
                    .slice(1)
                    .map(
                      (span) => `"${span ? text.slice(span[0], span[1]) : ''}"`
                    )
                    .join(', ')}
                </span>
              )}
            </div>
          ))}
          {result.matches.length > MAX_LISTED_MATCHES && (
            <p className="text-2xs text-muted-foreground/70">
              …and{' '}
              {(result.matches.length - MAX_LISTED_MATCHES).toLocaleString()}{' '}
              more not listed.
            </p>
          )}
        </div>
      )}
    </GlassCard>
  );
}
