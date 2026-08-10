import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  CircleDashed,
  Sparkles,
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import AutoTextarea from '@/components/shared/AutoTextarea';
import JsonHighlight from '@/components/shared/JsonHighlight';
import { cn } from '@/lib/cn';

const TIME_CLAIMS = new Set(['exp', 'iat', 'nbf']);

const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5MDAwMDAwMDB9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

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

function humanizeClaims(obj: Record<string, unknown>): string {
  const withDates: Record<string, unknown> = { ...obj };
  for (const key of TIME_CLAIMS) {
    const v = obj[key];
    if (typeof v === 'number') {
      withDates[key] = `${v} (${new Date(v * 1000).toLocaleString()})`;
    }
  }
  return JSON.stringify(withDates, null, 2);
}

function humanizeDuration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

interface Decoded {
  header: string;
  payload: string;
  payloadObj: Record<string, unknown>;
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
  const payloadObj = JSON.parse(base64UrlDecode(rawPayload)) as Record<
    string,
    unknown
  >;
  return {
    header: JSON.stringify(JSON.parse(base64UrlDecode(rawHeader)), null, 2),
    payload: humanizeClaims(payloadObj),
    payloadObj,
    signature,
  };
}

function ExpiryBadge({ exp }: { exp: unknown }) {
  if (typeof exp !== 'number') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-2xs text-muted-foreground">
        <CircleDashed className="h-3.5 w-3.5" /> No expiry claim
      </span>
    );
  }
  const expired = exp * 1000 < Date.now();
  const diff = humanizeDuration(Math.abs(exp - Date.now() / 1000));
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-2xs font-medium',
        expired
          ? 'border-neon-pink/40 bg-neon-pink/10 text-neon-pink'
          : 'border-neon/40 bg-neon/10 text-neon'
      )}
    >
      {expired ? (
        <XCircle className="h-3.5 w-3.5" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" />
      )}
      {expired ? `Expired ${diff} ago` : `Valid — expires in ${diff}`}
    </span>
  );
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
      <JsonHighlight
        code={value}
        className="glass-thin max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl p-4 font-mono text-xs"
      />
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
      <div className="flex items-center justify-between">
        <label className="label mb-0" htmlFor="jwt-input">
          Paste a JWT
        </label>
        <button
          type="button"
          onClick={() => setToken(SAMPLE_JWT)}
          className="flex items-center gap-1 text-2xs text-muted-foreground transition-colors hover:text-neon"
        >
          <Sparkles className="h-3.5 w-3.5" /> Load example
        </button>
      </div>
      <AutoTextarea
        id="jwt-input"
        className="input mt-1.5 min-h-24 font-mono text-xs"
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
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 space-y-4"
        >
          <ExpiryBadge exp={result.data.payloadObj.exp} />
          <OutputBlock label="Header" value={result.data.header} />
          <OutputBlock label="Payload" value={result.data.payload} />
          <OutputBlock
            label="Signature (raw, unverified)"
            value={result.data.signature}
          />
        </motion.div>
      )}
    </GlassCard>
  );
}
