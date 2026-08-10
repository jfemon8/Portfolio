import { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import AutoTextarea from '@/components/shared/AutoTextarea';

const TIME_CLAIMS = new Set(['exp', 'iat', 'nbf']);

function base64UrlDecode(input: string): string {
  const base64 = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(input.length + ((4 - (input.length % 4)) % 4), '=');
  const binary = atob(base64);
  const percentEncoded = Array.from(
    binary,
    (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')
  ).join('');
  return decodeURIComponent(percentEncoded);
}

function humanizeClaims(json: string): string {
  const obj = JSON.parse(json) as Record<string, unknown>;
  const withDates: Record<string, unknown> = { ...obj };
  for (const key of TIME_CLAIMS) {
    const v = obj[key];
    if (typeof v === 'number') {
      withDates[key] = `${v} (${new Date(v * 1000).toLocaleString()})`;
    }
  }
  return JSON.stringify(withDates, null, 2);
}

interface Decoded {
  header: string;
  payload: string;
  signature: string;
}

function decodeJwt(token: string): Decoded {
  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    throw new Error(
      'A JWT has 3 dot-separated parts (header.payload.signature).'
    );
  }
  const [rawHeader, rawPayload, signature] = parts as [string, string, string];
  return {
    header: JSON.stringify(JSON.parse(base64UrlDecode(rawHeader)), null, 2),
    payload: humanizeClaims(base64UrlDecode(rawPayload)),
    signature,
  };
}

function OutputBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = (): void => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="label mb-0">{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-1 text-2xs text-muted-foreground transition-colors hover:text-neon"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="glass-thin max-h-64 overflow-auto rounded-xl p-4 font-mono text-xs text-foreground">
        {value}
      </pre>
    </div>
  );
}

export default function JwtDecoder() {
  const [token, setToken] = useState('');

  const result = useMemo(() => {
    if (!token.trim()) return null;
    try {
      return { data: decodeJwt(token), error: null as string | null };
    } catch (e) {
      return {
        data: null,
        error: e instanceof Error ? e.message : 'Could not decode this token.',
      };
    }
  }, [token]);

  return (
    <GlassCard className="p-6">
      <label className="label" htmlFor="jwt-input">
        Paste a JWT
      </label>
      <AutoTextarea
        id="jwt-input"
        className="input min-h-24 font-mono text-xs"
        placeholder="eyJhbGciOi..."
        value={token}
        onChange={(e) => setToken(e.target.value)}
      />
      <p className="mt-2 text-2xs text-muted-foreground/70">
        Decoded entirely in your browser — the token never leaves this page.
        Signature verification needs the secret/key, which isn't (and can't
        safely be) entered here, so only the raw signature segment is shown.
      </p>

      {result?.error && (
        <p className="mt-4 text-sm text-neon-pink">{result.error}</p>
      )}

      {result?.data && (
        <div className="mt-5 space-y-4">
          <OutputBlock label="Header" value={result.data.header} />
          <OutputBlock label="Payload" value={result.data.payload} />
          <OutputBlock
            label="Signature (raw, unverified)"
            value={result.data.signature}
          />
        </div>
      )}
    </GlassCard>
  );
}
