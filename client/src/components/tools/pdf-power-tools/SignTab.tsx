import { useEffect, useRef, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  Loader2,
  PenLine,
  Type as TypeIcon,
  ImageIcon,
  Plus,
  X,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import {
  renderPageThumbnails,
  renderSinglePage,
  applySignatures,
  imageFileToSignaturePng,
  downloadBytes,
} from '@/lib/pdfTools';
import Dropzone from './Dropzone';
import PageThumbGrid from './PageThumbGrid';
import SignaturePad from './SignaturePad';

const PREVIEW_SCALE = 1.1;
const INK_FONT = "64px 'Segoe Script', 'Brush Script MT', cursive";
const DEFAULT_WIDTH_PCT = 0.28;

type InputMode = 'draw' | 'type' | 'image';

interface SignatureAsset {
  dataUrl: string;
  aspect: number;
}

interface Placement extends SignatureAsset {
  id: string;
  pageIndex: number;
  xPct: number;
  yPct: number;
  widthPct: number;
}

let placementSeq = 0;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function renderTypedSignature(name: string): SignatureAsset | null {
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
  return { dataUrl: canvas.toDataURL('image/png'), aspect: height / width };
}

export default function SignTab() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [activePage, setActivePage] = useState(0);
  const [pagePreview, setPagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [inputMode, setInputMode] = useState<InputMode>('draw');
  const [typedName, setTypedName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeWhiteBg, setRemoveWhiteBg] = useState(true);
  const [draft, setDraft] = useState<SignatureAsset | null>(null);

  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ id: string; dxPct: number; dyPct: number } | null>(
    null
  );

  const selected = placements.find((p) => p.id === selectedId) ?? null;
  const pagePlacements = placements.filter((p) => p.pageIndex === activePage);

  const loadFile = async (files: File[]) => {
    const picked = files[0];
    if (!picked) return;
    setFile(picked);
    setThumbnails([]);
    setPagePreview(null);
    setActivePage(0);
    setPlacements([]);
    setSelectedId(null);
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
    if (inputMode === 'type') setDraft(renderTypedSignature(typedName));
  }, [inputMode, typedName]);

  useEffect(() => {
    if (inputMode !== 'image' || !imageFile) return;
    let cancelled = false;
    imageFileToSignaturePng(imageFile, removeWhiteBg)
      .then((asset) => {
        if (!cancelled) setDraft(asset);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not read that image.');
      });
    return () => {
      cancelled = true;
    };
  }, [inputMode, imageFile, removeWhiteBg]);

  const switchMode = (mode: InputMode) => {
    setInputMode(mode);
    setDraft(null);
  };

  const heightPctOf = (p: Placement, rect: DOMRect): number =>
    p.widthPct * (rect.width / rect.height) * p.aspect;

  const addPlacement = () => {
    if (!draft) return;
    const rect = previewRef.current?.getBoundingClientRect();
    const widthPct = DEFAULT_WIDTH_PCT;
    const heightPct = rect
      ? widthPct * (rect.width / rect.height) * draft.aspect
      : 0.1;
    const placement: Placement = {
      ...draft,
      id: `sig-${++placementSeq}`,
      pageIndex: activePage,
      widthPct,
      xPct: clamp(0.5 - widthPct / 2, 0, 1 - widthPct),
      yPct: clamp(0.75, 0, Math.max(0, 1 - heightPct)),
    };
    setPlacements((prev) => [...prev, placement]);
    setSelectedId(placement.id);
  };

  const updateSelected = (patch: Partial<Placement>) => {
    if (!selectedId) return;
    setPlacements((prev) =>
      prev.map((p) => (p.id === selectedId ? { ...p, ...patch } : p))
    );
  };

  const removePlacement = (id: string) => {
    setPlacements((prev) => prev.filter((p) => p.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  };

  const onOverlayPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    p: Placement
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      id: p.id,
      dxPct: (e.clientX - rect.left) / rect.width - p.xPct,
      dyPct: (e.clientY - rect.top) / rect.height - p.yPct,
    };
    setSelectedId(p.id);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onOverlayPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const rect = previewRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;
    const pointerXPct = (e.clientX - rect.left) / rect.width;
    const pointerYPct = (e.clientY - rect.top) / rect.height;
    setPlacements((prev) =>
      prev.map((p) => {
        if (p.id !== drag.id) return p;
        const heightPct = heightPctOf(p, rect);
        return {
          ...p,
          xPct: clamp(pointerXPct - drag.dxPct, 0, Math.max(0, 1 - p.widthPct)),
          yPct: clamp(pointerYPct - drag.dyPct, 0, Math.max(0, 1 - heightPct)),
        };
      })
    );
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleApply = async () => {
    if (!file || placements.length === 0) return;
    setApplying(true);
    try {
      const bytes = await applySignatures(
        file,
        placements.map((p) => ({
          pageIndex: p.pageIndex,
          xPct: p.xPct,
          yPct: p.yPct,
          widthPct: p.widthPct,
          signaturePngDataUrl: p.dataUrl,
        }))
      );
      downloadBytes(bytes, `${file.name.replace(/\.pdf$/i, '')}-signed.pdf`);
      toast.success(
        `Applied ${placements.length} signature${placements.length === 1 ? '' : 's'}`
      );
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
          <label className="label">
            Page{' '}
            <span className="normal-case text-muted-foreground/60">
              (signatures are kept per page)
            </span>
          </label>
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
              {pagePlacements.length > 0
                ? 'Drag a signature to reposition it. Click one to select, then resize or remove it.'
                : 'Create a signature on the right, then add it to this page.'}
            </p>
            <div
              ref={previewRef}
              onPointerDown={() => setSelectedId(null)}
              className="relative overflow-hidden rounded-lg border border-border/60"
            >
              <img
                src={pagePreview}
                alt={`Page ${activePage + 1}`}
                className="w-full select-none"
                draggable={false}
              />
              {previewLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg/60">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {pagePlacements.map((p) => (
                <div
                  key={p.id}
                  onPointerDown={(e) => onOverlayPointerDown(e, p)}
                  onPointerMove={onOverlayPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className={cn(
                    'absolute cursor-move touch-none',
                    p.id === selectedId && 'ring-1 ring-primary'
                  )}
                  style={{
                    left: `${p.xPct * 100}%`,
                    top: `${p.yPct * 100}%`,
                    width: `${p.widthPct * 100}%`,
                  }}
                >
                  <img
                    src={p.dataUrl}
                    alt="Signature"
                    className="pointer-events-none w-full select-none"
                    draggable={false}
                  />
                  {p.id === selectedId && (
                    <button
                      type="button"
                      aria-label="Remove signature"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => removePlacement(p.id)}
                      className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground shadow"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {selected && (
              <div className="mt-3">
                <label className="label" htmlFor="sig-size">
                  Selected signature size
                </label>
                <input
                  id="sig-size"
                  type="range"
                  min={0.08}
                  max={0.6}
                  step={0.01}
                  value={selected.widthPct}
                  onChange={(e) =>
                    updateSelected({ widthPct: Number(e.target.value) })
                  }
                  className="w-full accent-primary"
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div role="tablist" className="flex flex-wrap gap-2">
              <ModeButton
                active={inputMode === 'draw'}
                icon={<PenLine className="h-3.5 w-3.5" />}
                label="Draw"
                onClick={() => switchMode('draw')}
              />
              <ModeButton
                active={inputMode === 'type'}
                icon={<TypeIcon className="h-3.5 w-3.5" />}
                label="Type"
                onClick={() => switchMode('type')}
              />
              <ModeButton
                active={inputMode === 'image'}
                icon={<ImageIcon className="h-3.5 w-3.5" />}
                label="Image"
                onClick={() => switchMode('image')}
              />
            </div>

            {inputMode === 'draw' && (
              <SignaturePad
                onChange={(dataUrl, size) =>
                  setDraft(
                    dataUrl
                      ? { dataUrl, aspect: size.height / size.width }
                      : null
                  )
                }
              />
            )}

            {inputMode === 'type' && (
              <input
                className="input"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Type your name"
              />
            )}

            {inputMode === 'image' && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-border/70 p-4 text-center transition-colors hover:border-primary/40"
                >
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-foreground">
                    {imageFile?.name ?? 'Choose a signature image'}
                  </span>
                  <span className="text-2xs text-muted-foreground/70">
                    PNG, JPG, or WebP
                  </span>
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const picked = e.target.files?.[0];
                    if (picked) setImageFile(picked);
                    e.target.value = '';
                  }}
                />
                <label className="flex items-center gap-2 text-2xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={removeWhiteBg}
                    onChange={(e) => setRemoveWhiteBg(e.target.checked)}
                    className="accent-primary"
                  />
                  Remove white background
                </label>
              </div>
            )}

            {draft && (
              <div className="rounded-lg border border-border/60 bg-white p-2">
                <img
                  src={draft.dataUrl}
                  alt="Signature preview"
                  className="w-full"
                />
              </div>
            )}

            <Button onClick={addPlacement} disabled={!draft} className="w-full">
              <Plus className="h-4 w-4" />
              Add to page {activePage + 1}
            </Button>

            {placements.length > 0 && (
              <div>
                <label className="label">Placed ({placements.length})</label>
                <ul className="space-y-1.5">
                  {placements.map((p) => (
                    <li
                      key={p.id}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors',
                        p.id === selectedId
                          ? 'border-primary/60 bg-primary/10'
                          : 'border-border/60'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActivePage(p.pageIndex);
                          setSelectedId(p.id);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <span className="flex h-6 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-white">
                          <img src={p.dataUrl} alt="" className="max-h-full" />
                        </span>
                        <span className="truncate text-2xs text-muted-foreground">
                          Page {p.pageIndex + 1}
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label="Remove"
                        onClick={() => removePlacement(p.id)}
                        className="rounded p-1 text-muted-foreground/70 transition-colors hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              onClick={handleApply}
              disabled={placements.length === 0 || applying}
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
