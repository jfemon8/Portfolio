import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  Upload,
  Loader2,
  Download,
  MailCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Copy,
  Search,
  Sparkles,
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { ExtractionResult } from '@/lib/email/extract';
import type { VerifiedEmail } from '@/lib/email/verify';
import type { EmailVerdict } from '@/lib/email/classify';
import type { DomainInfo } from '@/lib/email/dns';
import type {
  EmailVerifyRequest,
  EmailWorkerMessage,
} from '@/workers/emailVerify.types';
import type {
  EmailExtractRequest,
  EmailExtractWorkerMessage,
} from '@/workers/emailExtract.types';

const EXTRACT_DEBOUNCE_MS = 200;
// Past this, rendering the raw text costs seconds of browser layout for no benefit — a summary is shown instead.
const LARGE_INPUT_CHARS = 300_000;
const EMPTY_EXTRACTION: ExtractionResult = {
  emails: [],
  totalFound: 0,
  duplicatesRemoved: 0,
  uniqueDomains: 0,
};

// Safety ceiling only — the real cost is unique domains, so this sits far above any realistic list.
const MAX_EMAILS = 250000;
const DOMAIN_CACHE_MAX = 3000;
const DOMAIN_CACHE_MS = 10 * 60 * 1000;
const FAILED_LOOKUP_CACHE_MS = 30 * 1000;
const SAMPLE_INPUT = `Maya: maya@example.com\nSales: sales@acme.test\nTypo: hello@gmial.com\nTemporary: signup@mailinator.com\nDuplicate: maya@example.com`;
const VERDICTS: {
  key: EmailVerdict;
  label: string;
  icon: typeof CheckCircle2;
  text: string;
  chip: string;
}[] = [
  {
    key: 'valid',
    label: 'Valid',
    icon: CheckCircle2,
    text: 'text-neon',
    chip: 'bg-neon/10 text-neon',
  },
  {
    key: 'risky',
    label: 'Risky',
    icon: AlertTriangle,
    text: 'text-amber-400',
    chip: 'bg-amber-400/10 text-amber-400',
  },
  {
    key: 'invalid',
    label: 'Invalid',
    icon: XCircle,
    text: 'text-destructive',
    chip: 'bg-destructive/10 text-destructive',
  },
  {
    key: 'unknown',
    label: 'Unknown',
    icon: HelpCircle,
    text: 'text-muted-foreground',
    chip: 'bg-bg-elevated text-muted-foreground',
  },
];

const GROUP_ORDER: EmailVerdict[] = ['valid', 'risky', 'invalid', 'unknown'];

// Memoized so progress/result updates never re-render a textarea holding megabytes, which re-measures every line.
const PasteArea = memo(function PasteArea({
  value,
  onChange,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <textarea
      id="email-input"
      // Deliberately not auto-growing: a 10k-line paste would set a 160,000px inline height CSS then clamps anyway.
      data-lenis-prevent
      rows={10}
      className="input mt-1.5 resize-y overflow-auto overscroll-contain font-mono text-xs"
      placeholder="Prose, CSV rows, JSON, HTML, mailto: links — addresses are found anywhere in the text."
      value={value}
      onChange={onChange}
    />
  );
});

// Grouped and numbered per verdict so the file opens as contiguous blocks, while staying strictly parseable.
function toCsv(rows: VerifiedEmail[]): string {
  const head = [
    'group',
    'group_row',
    'email',
    'verdict',
    'reason',
    'domain',
    'mail_provider',
    'disposable',
    'role_account',
    'free_provider',
    'suggested_domain',
  ];
  // Excel treats cells beginning with these characters as formulas, even when
  // quoted. Keep exports safe when an untrusted list is opened in a spreadsheet.
  const esc = (v: string | number) => {
    const value = String(v);
    const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safeValue.replace(/"/g, '""')}"`;
  };

  const lines: string[] = [];
  for (const verdict of GROUP_ORDER) {
    const group = rows
      .filter((r) => r.verdict === verdict)
      .sort((a, b) => a.email.localeCompare(b.email));
    group.forEach((r, i) => {
      lines.push(
        [
          verdict.toUpperCase(),
          i + 1,
          r.email,
          r.verdict,
          r.reason,
          r.domain,
          r.domainInfo?.provider ?? '',
          r.flags.disposable ? 'yes' : 'no',
          r.flags.role ? 'yes' : 'no',
          r.flags.freeProvider ? 'yes' : 'no',
          r.flags.suggestion ?? '',
        ]
          .map(esc)
          .join(',')
      );
    });
  }
  return [head.join(','), ...lines].join('\n');
}

export default function EmailVerifier() {
  const [text, setText] = useState('');
  const [results, setResults] = useState<VerifiedEmail[] | null>(null);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<EmailVerdict | 'all'>('all');
  const [query, setQuery] = useState('');
  const [extraction, setExtraction] =
    useState<ExtractionResult>(EMPTY_EXTRACTION);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const scanWorkerRef = useRef<Worker | null>(null);
  const scanIdRef = useRef(0);
  const domainCacheRef = useRef(
    new Map<string, { info: DomainInfo; expiresAt: number }>()
  );

  // Debounced so typing never re-scans per keystroke; the pending flag drives a spinner instead of a dead screen.
  useEffect(() => {
    const requestId = ++scanIdRef.current;
    if (!text.trim()) {
      setExtraction(EMPTY_EXTRACTION);
      setScanning(false);
      return;
    }
    setScanning(true);
    const id = setTimeout(() => {
      const worker = new Worker(
        new URL('../../workers/emailExtract.worker.ts', import.meta.url),
        { type: 'module' }
      );
      scanWorkerRef.current = worker;
      worker.onmessage = (event: MessageEvent<EmailExtractWorkerMessage>) => {
        const msg = event.data;
        if (msg.id !== requestId || scanWorkerRef.current !== worker) return;
        if (msg.type === 'result') {
          setExtraction(msg.extraction);
        } else {
          setExtraction(EMPTY_EXTRACTION);
          toast.error(msg.message);
        }
        setScanning(false);
        worker.terminate();
        scanWorkerRef.current = null;
      };
      worker.onerror = () => {
        if (scanWorkerRef.current !== worker) return;
        setExtraction(EMPTY_EXTRACTION);
        setScanning(false);
        toast.error('Could not scan the input. Please try again.');
        worker.terminate();
        scanWorkerRef.current = null;
      };
      worker.postMessage({
        type: 'extract',
        id: requestId,
        text,
      } satisfies EmailExtractRequest);
    }, EXTRACT_DEBOUNCE_MS);
    return () => {
      clearTimeout(id);
      scanWorkerRef.current?.terminate();
      scanWorkerRef.current = null;
    };
  }, [text]);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      scanWorkerRef.current?.terminate();
    },
    []
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      valid: 0,
      risky: 0,
      invalid: 0,
      unknown: 0,
    };
    for (const r of results ?? []) c[r.verdict] = (c[r.verdict] ?? 0) + 1;
    return c;
  }, [results]);

  const visible = useMemo(() => {
    const byVerdict =
      filter === 'all'
        ? (results ?? [])
        : (results ?? []).filter((r) => r.verdict === filter);
    const term = query.trim().toLowerCase();
    if (!term) return byVerdict;
    return byVerdict.filter((r) =>
      [r.email, r.domain, r.reason, r.domainInfo?.provider ?? ''].some(
        (value) => value.toLowerCase().includes(term)
      )
    );
  }, [results, filter, query]);

  const replaceText = useCallback((next: string): void => {
    // Input and results always belong to the same batch. Invalidate any work
    // immediately so an old worker can never overwrite a newly pasted list.
    scanIdRef.current++;
    scanWorkerRef.current?.terminate();
    scanWorkerRef.current = null;
    workerRef.current?.terminate();
    workerRef.current = null;
    setText(next);
    setExtraction(EMPTY_EXTRACTION);
    setScanning(Boolean(next.trim()));
    setResults(null);
    setRunning(false);
    setProgress(null);
    setFilter('all');
    setQuery('');
  }, []);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => replaceText(e.target.value),
    [replaceText]
  );

  const handleFile = async (file: File): Promise<void> => {
    try {
      replaceText(await file.text());
    } catch {
      toast.error('Could not read that file.');
    }
  };

  const stopWorker = (): void => {
    workerRef.current?.terminate();
    workerRef.current = null;
  };

  const handleVerify = (): void => {
    const emails = extraction.emails
      .slice(0, MAX_EMAILS)
      .map((e) => e.normalized);
    if (!emails.length) return;

    stopWorker();
    setRunning(true);
    setResults(null);
    setQuery('');
    setProgress({ done: 0, total: extraction.uniqueDomains });

    const now = Date.now();
    const domains = new Set(
      emails.map((email) => email.slice(email.lastIndexOf('@') + 1))
    );
    const domainCache: Array<[string, DomainInfo]> = [];
    for (const domain of domains) {
      const cached = domainCacheRef.current.get(domain);
      if (!cached) continue;
      if (cached.expiresAt <= now) {
        domainCacheRef.current.delete(domain);
      } else {
        domainCache.push([domain, cached.info]);
      }
    }

    const worker = new Worker(
      new URL('../../workers/emailVerify.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<EmailWorkerMessage>) => {
      const msg = event.data;
      if (workerRef.current !== worker) return;
      if (msg.type === 'progress') {
        setProgress({ done: msg.done, total: msg.total });
      } else if (msg.type === 'result') {
        const cachedAt = Date.now();
        for (const result of msg.results) {
          if (!result.domainInfo) continue;
          domainCacheRef.current.set(result.domain, {
            info: result.domainInfo,
            expiresAt:
              cachedAt +
              (result.domainInfo.status === 'lookup-failed'
                ? FAILED_LOOKUP_CACHE_MS
                : DOMAIN_CACHE_MS),
          });
        }
        while (domainCacheRef.current.size > DOMAIN_CACHE_MAX) {
          const oldest = domainCacheRef.current.keys().next().value;
          if (oldest === undefined) break;
          domainCacheRef.current.delete(oldest);
        }
        setResults(msg.results);
        setRunning(false);
        setProgress(null);
        toast.success(
          `Checked ${msg.results.length.toLocaleString()} addresses`
        );
        stopWorker();
      } else {
        toast.error(msg.message);
        setRunning(false);
        setProgress(null);
        stopWorker();
      }
    };

    worker.onerror = () => {
      toast.error('Verification failed — please try again.');
      setRunning(false);
      setProgress(null);
      stopWorker();
    };

    worker.postMessage({
      type: 'verify',
      emails,
      domainCache,
    } satisfies EmailVerifyRequest);
  };

  const handleCancel = (): void => {
    stopWorker();
    setRunning(false);
    setProgress(null);
  };

  const download = (rows: VerifiedEmail[], name: string): void => {
    const blob = new Blob(['\ufeff', toCsv(rows)], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 10_000);
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-bg-elevated/40 p-3.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 translate-y-0.5 text-neon" />
        <p>
          Your list is parsed and checked safely. No signup, no limits, but no
          stored copy.
        </p>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="label mb-0" htmlFor="email-input">
            Paste anything containing emails
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => replaceText(SAMPLE_INPUT)}
              className="flex items-center gap-1.5 text-2xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Sparkles className="h-3.5 w-3.5" /> Try sample
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-2xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Upload className="h-3.5 w-3.5" /> Load .txt / .csv
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,text/plain,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = '';
            }}
          />
        </div>
        {text.length > LARGE_INPUT_CHARS ? (
          <div className="input mt-1.5 flex items-center justify-between gap-3 py-3">
            <span className="text-xs text-muted-foreground">
              {(text.length / 1024 / 1024).toFixed(2)} MB loaded — too large to
              display without slowing the page down.
            </span>
            <Button size="sm" variant="ghost" onClick={() => replaceText('')}>
              Clear
            </Button>
          </div>
        ) : (
          <PasteArea value={text} onChange={handleTextChange} />
        )}
        {text.trim() !== '' &&
          (scanning ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-2xs text-muted-foreground/70">
              <Loader2 className="h-3 w-3 animate-spin" /> Scanning for
              addresses…
            </p>
          ) : (
            <p className="mt-1.5 text-2xs text-muted-foreground/70">
              Found{' '}
              <span className="text-foreground">
                {extraction.emails.length.toLocaleString()}
              </span>{' '}
              unique address{extraction.emails.length === 1 ? '' : 'es'}
              {extraction.uniqueDomains > 0 &&
                ` across ${extraction.uniqueDomains.toLocaleString()} domain${extraction.uniqueDomains === 1 ? '' : 's'}`}
              {extraction.duplicatesRemoved > 0 &&
                ` · ${extraction.duplicatesRemoved.toLocaleString()} duplicate${extraction.duplicatesRemoved === 1 ? '' : 's'} removed`}
              {extraction.emails.length > MAX_EMAILS &&
                ` · only the first ${MAX_EMAILS.toLocaleString()} will be checked`}
            </p>
          ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          onClick={handleVerify}
          disabled={extraction.emails.length === 0 || running || scanning}
        >
          <MailCheck className="h-4 w-4" />
          {running
            ? 'Checking…'
            : `Verify ${extraction.emails.length.toLocaleString() || ''}`}
        </Button>
        {running && (
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
        )}
        {extraction.emails.length > 0 && !running && (
          <button
            type="button"
            onClick={() =>
              void navigator.clipboard
                .writeText(
                  extraction.emails.map((e) => e.normalized).join('\n')
                )
                .then(() => toast.success('Addresses copied'))
            }
            className="flex items-center gap-1.5 text-2xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Copy className="h-3.5 w-3.5" /> Copy extracted addresses
          </button>
        )}
      </div>

      {running && progress && (
        <div className="mt-4">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {progress.total > 0
              ? `Checking domain ${progress.done} of ${progress.total}`
              : 'Preparing…'}
          </p>
          {progress.total > 0 && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
              <div
                className="h-full bg-neon transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          )}
          <p className="mt-1.5 text-2xs text-muted-foreground/70">
            Addresses sharing a domain are checked once, so large lists finish
            in a fraction of the lookups.
          </p>
        </div>
      )}

      {results && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-6"
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {VERDICTS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setFilter(filter === v.key ? 'all' : v.key)}
                className={cn(
                  'rounded-xl border p-3 text-left transition-colors',
                  filter === v.key
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-border/60 hover:border-primary/40'
                )}
              >
                <span
                  className={cn(
                    'flex items-center gap-1.5 text-2xs font-semibold',
                    v.text
                  )}
                >
                  <v.icon className="h-3.5 w-3.5" />
                  {v.label}
                </span>
                <span className="mt-0.5 block text-xl font-bold tabular-nums text-foreground">
                  {(counts[v.key] ?? 0).toLocaleString()}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => download(results, 'email-results.csv')}
            >
              <Download className="h-4 w-4" /> Export all CSV
            </Button>
            {GROUP_ORDER.filter((v) => (counts[v] ?? 0) > 0).map((v) => (
              <Button
                key={v}
                size="sm"
                variant="ghost"
                onClick={() =>
                  download(
                    results.filter((r) => r.verdict === v),
                    `email-${v}.csv`
                  )
                }
              >
                {v} only ({counts[v]})
              </Button>
            ))}
            {filter !== 'all' && (
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="text-2xs text-muted-foreground hover:text-foreground"
              >
                Clear filter
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-bg-elevated/35 p-2.5">
            <label className="relative min-w-52 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                aria-label="Search verification results"
                className="input min-h-0 w-full py-2 pl-8 text-xs"
                placeholder="Search address, domain, provider or reason"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={() =>
                void navigator.clipboard
                  .writeText(visible.map((r) => r.email).join('\n'))
                  .then(() => toast.success('Visible addresses copied'))
              }
              disabled={visible.length === 0}
              className="flex items-center gap-1.5 px-1.5 text-2xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Copy className="h-3.5 w-3.5" /> Copy visible (
              {visible.length.toLocaleString()})
            </button>
          </div>

          <div
            data-lenis-prevent
            tabIndex={0}
            className="mt-3 max-h-96 overflow-auto overscroll-contain rounded-xl border border-border/60"
          >
            <table className="w-full text-left text-2xs">
              <thead className="sticky top-0 bg-bg-elevated/95 backdrop-blur">
                <tr className="text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">Address</th>
                  <th className="px-3 py-2 font-semibold">Verdict</th>
                  <th className="px-3 py-2 font-semibold">Why</th>
                  <th className="hidden px-3 py-2 font-semibold sm:table-cell">
                    Mail host
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.slice(0, 500).map((r) => {
                  const v = VERDICTS.find((x) => x.key === r.verdict)!;
                  return (
                    <tr key={r.email} className="border-t border-border/40">
                      <td className="px-3 py-1.5 font-mono text-foreground">
                        {r.email}
                      </td>
                      <td className="px-3 py-1.5">
                        <span
                          className={cn('rounded-full px-2 py-0.5', v.chip)}
                        >
                          {v.label}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {r.reason}
                      </td>
                      <td className="hidden px-3 py-1.5 text-muted-foreground/70 sm:table-cell">
                        {r.domainInfo?.provider ?? '—'}
                      </td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-8 text-center text-xs text-muted-foreground"
                    >
                      No results match this search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {visible.length > 500 && (
              <p className="border-t border-border/40 px-3 py-2 text-2xs text-muted-foreground/70">
                Showing the first 500 of {visible.length.toLocaleString()} —
                export the CSV for the full list.
              </p>
            )}
          </div>

          <p className="mt-3 text-2xs text-muted-foreground/70">
            Verdicts come from the domain's real mail configuration (MX records,
            RFC 7505 null-MX, NXDOMAIN) plus disposable, role and typo checks.
            No tool — paid ones included — can confirm an individual mailbox
            exists without sending mail: providers accept unknown recipients on
            catch-all domains, so treat "valid" as "the domain genuinely accepts
            mail", not a delivery guarantee.
          </p>
        </motion.div>
      )}
    </GlassCard>
  );
}
