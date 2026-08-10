import { useMemo, useState } from 'react';
import { Copy, Check, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import AutoTextarea from '@/components/shared/AutoTextarea';
import JsonHighlight from '@/components/shared/JsonHighlight';

const SAMPLE_JSON = JSON.stringify(
  {
    name: 'Md Jannatul Ferdhous Emon',
    role: 'Full-Stack Developer',
    yearsExperience: 3,
    isAvailable: true,
    skills: ['React', 'Node.js', 'MongoDB'],
    manager: null,
  },
  null,
  2
);

// V8 sometimes already embeds "(line X column Y)" (recent Node/Chrome); older builds only give "at position N", which this derives line/column from — Firefox/Safari's differently-worded messages just pass through as-is.
function describeJsonError(message: string, raw: string): string {
  if (/\(line \d+ column \d+\)/.test(message)) return message;
  const posMatch = message.match(/at position (\d+)/);
  if (!posMatch?.[1]) return message;
  const pos = Number(posMatch[1]);
  const before = raw.slice(0, pos);
  const line = before.split('\n').length;
  const col = pos - before.lastIndexOf('\n');
  return `${message} (line ${line}, column ${col})`;
}

export default function JsonFormatter() {
  const [raw, setRaw] = useState('');
  const [indent, setIndent] = useState(2);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!raw.trim()) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return {
        formatted: JSON.stringify(parsed, null, indent),
        error: null as string | null,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Invalid JSON.';
      return {
        formatted: null,
        error: describeJsonError(message, raw),
      };
    }
  }, [raw, indent]);

  const onCopy = (): void => {
    if (!result?.formatted) return;
    void navigator.clipboard.writeText(result.formatted).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <GlassCard className="p-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between mt-1.5 mb-1.5">
            <label className="label mb-0" htmlFor="json-input">
              Paste JSON
            </label>
            <button
              type="button"
              onClick={() => setRaw(SAMPLE_JSON)}
              className="flex items-center gap-1 text-2xs text-muted-foreground transition-colors hover:text-neon"
            >
              <Sparkles className="h-3.5 w-3.5" /> Load example
            </button>
          </div>
          <AutoTextarea
            id="json-input"
            className="input mt-1.5 min-h-[19.5rem] font-mono text-xs"
            placeholder='{"hello": "world"}'
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="label mb-0">Formatted</span>
              {raw.trim() &&
                (result?.error ? (
                  <XCircle className="h-3.5 w-3.5 text-neon-pink" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-neon" />
                ))}
            </div>
            <div className="flex items-center gap-3">
              <select
                className="input min-h-0 w-auto py-1 text-xs"
                value={indent}
                onChange={(e) => setIndent(Number(e.target.value))}
              >
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
                <option value={0}>Minified</option>
              </select>
              <button
                type="button"
                onClick={onCopy}
                disabled={!result?.formatted}
                className="flex items-center gap-1 text-2xs text-muted-foreground transition-colors hover:text-neon disabled:opacity-40"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <JsonHighlight
            code={result?.formatted ?? ''}
            className="glass-thin h-[19.5rem] overflow-auto whitespace-pre-wrap break-words rounded-xl p-4 font-mono text-xs"
          />
          {result?.error && (
            <p className="mt-2 text-sm text-neon-pink">{result.error}</p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
