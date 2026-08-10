import { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import AutoTextarea from '@/components/shared/AutoTextarea';

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
      return {
        formatted: null,
        error: e instanceof Error ? e.message : 'Invalid JSON.',
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
          <label className="label" htmlFor="json-input">
            Paste JSON
          </label>
          <AutoTextarea
            id="json-input"
            className="input min-h-[19.5rem] font-mono text-xs"
            placeholder='{"hello": "world"}'
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label mb-0">Formatted</span>
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
          <pre className="glass-thin h-[19.5rem] overflow-auto rounded-xl p-4 font-mono text-xs text-foreground">
            {result?.formatted ?? ''}
          </pre>
          {result?.error && (
            <p className="mt-2 text-sm text-neon-pink">{result.error}</p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
