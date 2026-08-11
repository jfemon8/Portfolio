import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, ShrinkIcon, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import {
  readPdfSummary,
  compressSafe,
  compressRaster,
  downloadBytes,
  formatBytes,
  type PdfSummary,
} from '@/lib/pdfTools';
import Dropzone from './Dropzone';

const DPI_OPTIONS = [
  { dpi: 72, label: 'Smallest' },
  { dpi: 100, label: 'Balanced' },
  { dpi: 150, label: 'Higher quality' },
];

export default function CompressTab() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<PdfSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'safe' | 'raster'>('safe');
  const [dpi, setDpi] = useState(100);
  const [quality, setQuality] = useState(0.7);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [result, setResult] = useState<{
    bytes: Uint8Array;
    name: string;
  } | null>(null);

  const loadFile = async (files: File[]) => {
    const picked = files[0];
    if (!picked) return;
    setFile(picked);
    setResult(null);
    setSummary(null);
    setLoading(true);
    try {
      setSummary(await readPdfSummary(picked));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not read this PDF.'
      );
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCompress = async () => {
    if (!file) return;
    setCompressing(true);
    setResult(null);
    setProgress(
      mode === 'raster' ? { done: 0, total: summary?.pageCount ?? 0 } : null
    );
    try {
      const bytes =
        mode === 'safe'
          ? await compressSafe(file)
          : await compressRaster(
              file,
              { scale: dpi / 72, quality },
              (done, total) => setProgress({ done, total })
            );
      setResult({
        bytes,
        name: `${file.name.replace(/\.pdf$/i, '')}-compressed.pdf`,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not compress this PDF.'
      );
    } finally {
      setCompressing(false);
      setProgress(null);
    }
  };

  const originalSize = summary?.sizeBytes ?? 0;
  const resultSize = result?.bytes.length ?? 0;
  const pctChange =
    originalSize > 0 ? (1 - resultSize / originalSize) * 100 : 0;

  return (
    <div className="space-y-5">
      <Dropzone
        onFiles={loadFile}
        label={file ? file.name : 'Drop a PDF here, or click to choose a file'}
      />

      {loading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Reading file…
        </p>
      )}

      {summary && (
        <>
          <p className="text-sm text-muted-foreground">
            {summary.pageCount} page{summary.pageCount === 1 ? '' : 's'} ·{' '}
            {formatBytes(summary.sizeBytes)}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <ModeCard
              active={mode === 'safe'}
              title="Safe"
              description="Lossless structural cleanup. Never touches page content — savings depend on how the PDF was originally built."
              onClick={() => setMode('safe')}
            />
            <ModeCard
              active={mode === 'raster'}
              title="Aggressive"
              description="Rasterizes every page to a compressed image. Much smaller for scan-heavy PDFs, but text stops being selectable/searchable."
              onClick={() => setMode('raster')}
            />
          </div>

          {mode === 'raster' && (
            <div className="space-y-4 rounded-xl border border-border/60 bg-bg-elevated/40 p-4">
              <div>
                <label className="label">Resolution</label>
                <div className="flex gap-2">
                  {DPI_OPTIONS.map((opt) => (
                    <button
                      key={opt.dpi}
                      type="button"
                      onClick={() => setDpi(opt.dpi)}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-xs transition-colors',
                        dpi === opt.dpi
                          ? 'border-primary/60 bg-primary/10 text-primary'
                          : 'border-border/60 text-muted-foreground hover:border-primary/40'
                      )}
                    >
                      {opt.label}
                      <span className="ml-1 text-muted-foreground/60">
                        {opt.dpi} DPI
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label" htmlFor="jpeg-quality">
                  JPEG quality — {Math.round(quality * 100)}%
                </label>
                <input
                  id="jpeg-quality"
                  type="range"
                  min={0.3}
                  max={0.95}
                  step={0.05}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          )}

          <Button onClick={handleCompress} disabled={compressing}>
            <ShrinkIcon className="h-4 w-4" />
            {compressing ? 'Compressing…' : 'Compress'}
          </Button>

          {progress && progress.total > 0 && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
              <div
                className="h-full bg-neon transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-neon/40 bg-neon/5 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {formatBytes(originalSize)}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-semibold text-neon">
                  {formatBytes(resultSize)}
                </span>
                <span
                  className={cn(
                    'ml-1 font-semibold',
                    pctChange >= 0 ? 'text-neon' : 'text-amber-400'
                  )}
                >
                  ({pctChange >= 0 ? '−' : '+'}
                  {Math.abs(pctChange).toFixed(0)}%)
                </span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => downloadBytes(result.bytes, result.name)}
              >
                Download
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ModeCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border p-4 text-left transition-colors',
        active
          ? 'border-primary/60 bg-primary/10'
          : 'border-border/60 hover:border-primary/40'
      )}
    >
      <p
        className={cn(
          'text-sm font-semibold',
          active ? 'text-primary' : 'text-foreground'
        )}
      >
        {title}
      </p>
      <p className="mt-1 text-2xs text-muted-foreground/80">{description}</p>
    </button>
  );
}
