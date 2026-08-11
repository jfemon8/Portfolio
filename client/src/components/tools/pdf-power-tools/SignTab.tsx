import { useEffect, useRef, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Loader2, PenLine, Type as TypeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import {
  renderPageThumbnails,
  renderSinglePage,
  applySignature,
  downloadBytes,
} from '@/lib/pdfTools';
import Dropzone from './Dropzone';
import PageThumbGrid from './PageThumbGrid';
import SignaturePad from './SignaturePad';

const PREVIEW_SCALE = 1.1;
const INK_FONT = "64px 'Segoe Script', 'Brush Script MT', cursive";

interface SignatureData {
  dataUrl: string;
  width: number;
  height: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function renderTypedSignature(name: string): SignatureData | null {
  if (!name.trim()) return null;
  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) return null;
  measure.font = INK_FONT;
  const width = Math.max(220, Math.ceil(measure.measureText(name).width) + 48);
  const height = 140;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.font = INK_FONT;
  ctx.fillStyle = '#0f172a';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 24, height / 2);
  return { dataUrl: canvas.toDataURL('image/png'), width, height };
}

export default function SignTab() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [activePage, setActivePage] = useState(0);
  const [pagePreview, setPagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const [signature, setSignature] = useState<SignatureData | null>(null);
  const [placement, setPlacement] = useState({
    xPct: 0.62,
    yPct: 0.82,
    widthPct: 0.28,
  });
  const [applying, setApplying] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const loadFile = async (files: File[]) => {
    const picked = files[0];
    if (!picked) return;
    setFile(picked);
    setThumbnails([]);
    setPagePreview(null);
    setActivePage(0);
    setLoading(true);
    try {
      setThumbnails(await renderPageThumbnails(picked));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not read this PDF.'
      );
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!file || thumbnails.length === 0) return;
    let cancelled = false;
    setPreviewLoading(true);
    renderSinglePage(file, activePage, PREVIEW_SCALE)
      .then((url) => {
        if (!cancelled) setPagePreview(url);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not render that page.');
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file, activePage, thumbnails.length]);

  useEffect(() => {
    if (inputMode === 'type') setSignature(renderTypedSignature(typedName));
  }, [inputMode, typedName]);

  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!signature || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const clickXPct = (e.clientX - rect.left) / rect.width;
    const clickYPct = (e.clientY - rect.top) / rect.height;
    const heightPct =
      placement.widthPct *
      (rect.width / rect.height) *
      (signature.height / signature.width);
    setPlacement((p) => ({
      ...p,
      xPct: clamp(clickXPct - p.widthPct / 2, 0, Math.max(0, 1 - p.widthPct)),
      yPct: clamp(clickYPct - heightPct / 2, 0, Math.max(0, 1 - heightPct)),
    }));
  };

  const handleApply = async () => {
    if (!file || !signature) return;
    setApplying(true);
    try {
      const bytes = await applySignature(file, {
        pageIndex: activePage,
        xPct: placement.xPct,
        yPct: placement.yPct,
        widthPct: placement.widthPct,
        signaturePngDataUrl: signature.dataUrl,
      });
      downloadBytes(bytes, `${file.name.replace(/\.pdf$/i, '')}-signed.pdf`);
      toast.success('Signature applied');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not sign this PDF.'
      );
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-5">
      <Dropzone
        onFiles={loadFile}
        label={file ? file.name : 'Drop a PDF here, or click to choose a file'}
      />

      {loading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Rendering pages…
        </p>
      )}

      {thumbnails.length > 1 && (
        <div>
          <label className="label">Page to sign</label>
          <PageThumbGrid
            thumbnails={thumbnails}
            isSelected={(i) => i === activePage}
            onClick={setActivePage}
          />
        </div>
      )}

      {pagePreview && (
        <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
          <div>
            <p className="mb-1.5 text-2xs text-muted-foreground/70">
              {signature
                ? 'Click on the page to move your signature'
                : 'Draw or type a signature to place it'}
            </p>
            <div
              ref={previewRef}
              onClick={handlePreviewClick}
              className={cn(
                'relative overflow-hidden rounded-lg border border-border/60',
                signature && 'cursor-crosshair'
              )}
            >
              <img
                src={pagePreview}
                alt={`Page ${activePage + 1}`}
                className="w-full"
              />
              {previewLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg/60">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {signature && (
                <img
                  src={signature.dataUrl}
                  alt="Your signature"
                  className="pointer-events-none absolute"
                  style={{
                    left: `${placement.xPct * 100}%`,
                    top: `${placement.yPct * 100}%`,
                    width: `${placement.widthPct * 100}%`,
                    height: 'auto',
                  }}
                />
              )}
            </div>
            {signature && (
              <div className="mt-3">
                <label className="label" htmlFor="sig-size">
                  Signature size
                </label>
                <input
                  id="sig-size"
                  type="range"
                  min={0.12}
                  max={0.5}
                  step={0.01}
                  value={placement.widthPct}
                  onChange={(e) =>
                    setPlacement((p) => ({
                      ...p,
                      widthPct: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-primary"
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div role="tablist" className="flex gap-2">
              <ModeButton
                active={inputMode === 'draw'}
                icon={<PenLine className="h-3.5 w-3.5" />}
                label="Draw"
                onClick={() => setInputMode('draw')}
              />
              <ModeButton
                active={inputMode === 'type'}
                icon={<TypeIcon className="h-3.5 w-3.5" />}
                label="Type"
                onClick={() => setInputMode('type')}
              />
            </div>

            {inputMode === 'draw' ? (
              <SignaturePad
                onChange={(dataUrl, size) =>
                  setSignature(dataUrl ? { dataUrl, ...size } : null)
                }
              />
            ) : (
              <input
                className="input"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Type your name"
              />
            )}

            <Button
              onClick={handleApply}
              disabled={!signature || applying}
              className="w-full"
            >
              {applying ? 'Applying…' : 'Apply & Download'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors',
        active
          ? 'border-primary/60 bg-primary/10 text-primary'
          : 'border-border/60 text-muted-foreground hover:border-primary/40'
      )}
    >
      {icon}
      {label}
    </button>
  );
}
