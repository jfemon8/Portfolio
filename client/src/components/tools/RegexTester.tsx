import { useMemo, useState, Fragment } from 'react';
import GlassCard from '@/components/shared/GlassCard';
import AutoTextarea from '@/components/shared/AutoTextarea';

interface Segment {
  text: string;
  matched: boolean;
}

export default function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('gi');
  const [text, setText] = useState('');

  const result = useMemo(() => {
    if (!pattern) return null;
    try {
      // matchAll requires the global flag — added transparently so a user-typed "i" alone still works.
      const globalFlags = flags.includes('g') ? flags : `${flags}g`;
      const re = new RegExp(pattern, globalFlags);
      const matches = [...text.matchAll(re)];

      const segments: Segment[] = [];
      let cursor = 0;
      for (const m of matches) {
        if (m.index == null || m[0] === '') continue;
        if (m.index > cursor) {
          segments.push({ text: text.slice(cursor, m.index), matched: false });
        }
        segments.push({ text: m[0], matched: true });
        cursor = m.index + m[0].length;
      }
      if (cursor < text.length) {
        segments.push({ text: text.slice(cursor), matched: false });
      }

      return { segments, matches, error: null as string | null };
    } catch (e) {
      return {
        segments: null,
        matches: null,
        error: e instanceof Error ? e.message : 'Invalid regular expression.',
      };
    }
  }, [pattern, flags, text]);

  return (
    <GlassCard className="p-6">
      <div className="flex flex-col gap-3 sm:flex-row">
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
        <label className="label" htmlFor="regex-test-text">
          Test string
        </label>
        <AutoTextarea
          id="regex-test-text"
          className="input min-h-32 font-mono text-xs"
          placeholder="Paste text to test against…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      {result?.segments && text && (
        <div className="mt-4">
          <span className="label">
            Highlighted matches ({result.matches?.length ?? 0})
          </span>
          <div className="glass-thin whitespace-pre-wrap break-words rounded-xl p-4 font-mono text-xs text-foreground">
            {result.segments.map((seg, i) => (
              <Fragment key={i}>
                {seg.matched ? (
                  <mark className="rounded bg-primary/30 px-0.5 text-primary">
                    {seg.text}
                  </mark>
                ) : (
                  seg.text
                )}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {result?.matches && result.matches.length > 0 && (
        <div className="mt-4 space-y-2">
          <span className="label">Groups</span>
          {result.matches.map((m, i) => (
            <div
              key={i}
              className="glass-thin rounded-lg p-3 font-mono text-2xs text-muted-foreground"
            >
              <span className="text-foreground">Match {i + 1}:</span> "{m[0]}"
              {m.length > 1 && (
                <span>
                  {' '}
                  — groups:{' '}
                  {m
                    .slice(1)
                    .map((g) => `"${g ?? ''}"`)
                    .join(', ')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
