import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Check,
  Copy,
  Download,
  FileText,
  ImageIcon,
  Loader2,
  Maximize2,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import Lightbox from '@/components/shared/Lightbox';
import { downloadBytes } from '@/lib/pdfTools';
import { layoutToDocx, textToDocx } from '@/lib/docxWriter';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import {
  ocrImages,
  OCR_LANGUAGES,
  OCR_USABLE_CONFIDENCE,
  type OcrLanguage,
  type OcrImageResult,
} from '@/lib/pdfOcr';

const ACCEPT = 'image/png,image/jpeg,image/webp,image/bmp,image/gif';

export default function ImageToText() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [language, setLanguage] = useState<OcrLanguage | 'auto'>('auto');
  const [results, setResults] = useState<OcrImageResult[]>([]);
  /** Holds the user's manual corrections without destroying the per-image results. */
  const [edited, setEdited] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // One owner for the blob URLs: this cleanup runs on every replacement and on unmount.
  useEffect(
    () => () => {
      for (const url of previews) URL.revokeObjectURL(url);
    },
    [previews]
  );

  const text = edited ?? results.map((r) => r.text).join('\n\n');

  const accept = (picked: FileList | null): void => {
    const list = [...(picked ?? [])].filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    setFiles(list);
    setResults([]);
    setEdited(null);
    // A viewer left open on an index the new, shorter selection has no image for would stick open on nothing.
    setViewerIndex(null);
    setPreviews(list.map((f) => URL.createObjectURL(f)));
  };

  const run = async (): Promise<void> => {
    if (!files.length) return;
    setRunning(true);
    setResults([]);
    try {
      const out = await ocrImages(files, language, (p) =>
        setStatus(
          `Image ${p.page}/${p.totalPages} — ${p.status} ${Math.round(p.progress * 100)}%`
        )
      );
      setResults(out);
      const words = out.reduce((sum, r) => sum + r.text.split(/\s+/).length, 0);
      const mean =
        out.reduce((sum, r) => sum + r.confidence, 0) / (out.length || 1);
      if (out.some((r) => r.mode === 'handwriting-unavailable'))
        toast.error('Bengali handwriting cannot be read yet — printed only.');
      else if (out.some((r) => r.mode === 'handwriting'))
        toast.success(`Read ${words} words as handwriting`);
      else if (mean < OCR_USABLE_CONFIDENCE)
        toast.error(
          'Barely readable — try a sharper, flatter, better-lit shot.'
        );
      else toast.success(`Read ${words} words from ${out.length} image(s)`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not read those images.'
      );
    } finally {
      setStatus(null);
      setRunning(false);
    }
  };

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const baseName = (files[0]?.name ?? 'extracted-text').replace(
    /\.[a-z0-9]+$/i,
    ''
  );

  const saveTxt = (): void => {
    // downloadBytes anchors the link in the DOM; a detached one is ignored by Firefox.
    downloadBytes(
      new TextEncoder().encode(text),
      `${baseName}.txt`,
      'text/plain;charset=utf-8'
    );
  };

  const saveDocx = async (): Promise<void> => {
    setSaving(true);
    try {
      // Untouched output keeps its real alignment; a hand-edited one is plain text again.
      const layout = results.flatMap((r) => r.lines);
      const bytes =
        edited === null && layout.length
          ? await layoutToDocx(layout, results[0]?.width ?? 1000, baseName)
          : await textToDocx(text, baseName);
      downloadBytes(
        bytes,
        `${baseName}.docx`,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      toast.success('Editable .docx downloaded');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not build the document.'
      );
    } finally {
      setSaving(false);
    }
  };

  const clear = (): void => {
    setFiles([]);
    setPreviews([]);
    setResults([]);
    setEdited(null);
    setViewerIndex(null);
  };

  const averageConfidence = results.length
    ? Math.round(results.reduce((s, r) => s + r.confidence, 0) / results.length)
    : 0;
  const handwritten = results.some((r) => r.mode === 'handwriting');
  const noBengaliModel = results.some(
    (r) => r.mode === 'handwriting-unavailable'
  );
  const unusable =
    results.length > 0 &&
    !handwritten &&
    averageConfidence < OCR_USABLE_CONFIDENCE;

  return (
    <GlassCard className="p-6">
      <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-bg-elevated/40 p-3.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 translate-y-0.5 text-neon" />
        <p>
          The images are never stored. Bengali and English are both supported,
          and the language is detected for you.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
          dragging ? 'border-primary/60 bg-primary/5' : 'border-border/70'
        )}
      >
        <ImageIcon className="h-6 w-6 text-muted-foreground" />
        <span className="text-sm text-foreground">
          {files.length
            ? `${files.length} image${files.length === 1 ? '' : 's'} selected`
            : 'Drop images here, or click to choose'}
        </span>
        <span className="text-2xs text-muted-foreground/70">
          PNG, JPG, WebP, BMP or GIF · several at once is fine
        </span>
        <span className="text-2xs text-muted-foreground/60">
          Handwriting is read too — English only.
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          accept(e.target.files);
          e.target.value = '';
        }}
      />

      {previews.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {previews.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setViewerIndex(i)}
              aria-label={`View image ${i + 1} full screen`}
              className="group relative h-20 w-20 overflow-hidden rounded-lg border border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <img
                src={url}
                alt={`Selected ${i + 1}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute inset-0 grid place-items-center bg-background/50 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
                <Maximize2 className="h-4 w-4 text-foreground" />
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <select
          className="input sm:w-52"
          value={language}
          onChange={(e) => setLanguage(e.target.value as OcrLanguage | 'auto')}
        >
          <option value="auto">Detect language</option>
          {OCR_LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <Button
          onClick={() => void run()}
          disabled={!files.length || running}
          className="flex-1 py-1"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
          {running ? 'Reading…' : 'Extract text'}
        </Button>
        {files.length > 0 && (
          <Button variant="ghost" onClick={clear} disabled={running}>
            <Trash2 className="h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      {status && (
        <p className="mt-3 flex items-center gap-2 text-2xs text-neon">
          <Loader2 className="h-3 w-3 animate-spin" /> {status}
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span
              className={cn(
                'text-xs',
                unusable || noBengaliModel
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              )}
            >
              {handwritten
                ? 'Read as handwriting — check it against the image before using it.'
                : noBengaliModel
                  ? 'This looks like Bengali handwriting, which no available model can read yet. Printed Bengali works fine.'
                  : `Average confidence ${averageConfidence}%${
                      unusable
                        ? ' — this looks unreadable. Try a sharper, flatter, better-lit shot.'
                        : averageConfidence < 75
                          ? ' — try a sharper, flatter, better-lit photo'
                          : ''
                    }`}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void copy()}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button variant="outline" onClick={saveTxt}>
                <Download className="h-4 w-4" /> .txt
              </Button>
              <Button
                variant="outline"
                onClick={() => void saveDocx()}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                .docx
              </Button>
            </div>
          </div>
          {/* Lenis owns the wheel globally, so a scrollable box must opt out of it. */}
          <textarea
            value={text}
            onChange={(e) => setEdited(e.target.value)}
            data-lenis-prevent
            rows={14}
            className="input font-mono text-xs leading-relaxed"
            spellCheck={false}
          />
        </div>
      )}

      <Lightbox
        images={previews.map((url, i) => ({
          url,
          caption: files[i]?.name,
        }))}
        open={viewerIndex !== null}
        startIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />
    </GlassCard>
  );
}
