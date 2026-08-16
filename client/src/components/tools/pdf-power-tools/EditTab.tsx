import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Check,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  MousePointer2,
  Pencil,
  Square,
  Trash2,
  Type as TypeIcon,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import {
  renderPageThumbnails,
  renderSinglePage,
  downloadBytes,
} from '@/lib/pdfTools';
import { pdfToDocx } from '@/lib/pdfToDocx';
import {
  applyPdfEdits,
  pageTextRuns,
  readPageSizes,
  EDIT_FONT_CSS,
  FONT_CHOICES,
  isBoldFont,
  isItalicFont,
  type BandOptions,
  type EditElement,
  type EditFontKey,
  type PageNumberOptions,
  type PageSize,
  type PageTextRun,
  type PdfEditOptions,
  type WatermarkOptions,
} from '@/lib/pdfEdit';
import Dropzone from './Dropzone';
import PageThumbGrid from './PageThumbGrid';

const PREVIEW_SCALE = 1.3;
let elementSeq = 0;

type PlaceTool = 'text' | 'cover' | 'retype' | null;

const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

const band = (text: string, align: BandOptions['align']): BandOptions => ({
  enabled: false,
  text,
  align,
  fontKey: 'helvetica',
  fontSize: 10,
  color: '#444444',
  margin: 32,
  skipFirstPage: false,
});

const DEFAULT_NUMBERS: PageNumberOptions = {
  enabled: false,
  format: 'Page {n} of {total}',
  align: 'center',
  position: 'bottom',
  fontKey: 'helvetica',
  fontSize: 10,
  color: '#444444',
  margin: 24,
  startAt: 1,
  skipFirstPage: false,
};

const DEFAULT_WATERMARK: WatermarkOptions = {
  enabled: false,
  mode: 'text',
  dataUrl: '',
  aspect: 1,
  widthPct: 0.5,
  text: 'CONFIDENTIAL',
  fontKey: 'helvetica-bold',
  fontSize: 64,
  color: '#ff0000',
  opacity: 0.15,
  rotation: 45,
};

export default function EditTab() {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [workingFile, setWorkingFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [pageSizes, setPageSizes] = useState<PageSize[]>([]);
  const [activePage, setActivePage] = useState(0);
  const [pagePreview, setPagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [busy, setBusy] = useState<null | 'apply' | 'pdf' | 'docx'>(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  const [appliedRounds, setAppliedRounds] = useState(0);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const [textRuns, setTextRuns] = useState<PageTextRun[]>([]);

  const [elements, setElements] = useState<EditElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [placeTool, setPlaceTool] = useState<PlaceTool>(null);
  const [header, setHeader] = useState(band('Company name', 'left'));
  const [footer, setFooter] = useState(band('Confidential', 'center'));
  const [pageNumbers, setPageNumbers] = useState(DEFAULT_NUMBERS);
  const [watermark, setWatermark] = useState(DEFAULT_WATERMARK);
  const [metadata, setMetadata] = useState({
    title: '',
    author: '',
    subject: '',
  });

  const previewRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    id: string;
    mode: 'move' | 'resize';
    dxPct: number;
    dyPct: number;
  } | null>(null);

  const selected = elements.find((el) => el.id === selectedId) ?? null;
  const pageElements = elements.filter((el) => el.pageIndex === activePage);
  const size = pageSizes[activePage];
  const scale = size && previewWidth ? previewWidth / size.width : 1;

  const options = useMemo<PdfEditOptions>(
    () => ({ elements, header, footer, pageNumbers, watermark, metadata }),
    [elements, header, footer, pageNumbers, watermark, metadata]
  );

  const pending =
    elements.length > 0 ||
    header.enabled ||
    footer.enabled ||
    pageNumbers.enabled ||
    watermark.enabled ||
    Object.values(metadata).some((v) => v.trim());

  const openFile = useCallback(async (picked: File, keepEdits = false) => {
    setWorkingFile(picked);
    setLoading(true);
    try {
      const [thumbs, sizes] = await Promise.all([
        renderPageThumbnails(picked),
        readPageSizes(picked),
      ]);
      setThumbnails(thumbs);
      setPageSizes(sizes);
      if (!keepEdits) {
        setElements([]);
        setSelectedId(null);
        setActivePage(0);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not read this PDF.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFile = async (files: File[]): Promise<void> => {
    const picked = files[0];
    if (!picked) return;
    setSourceFile(picked);
    setAppliedRounds(0);
    setPagePreview(null);
    // Left blank on purpose: a pre-filled title counted as an edit and kept Apply enabled.
    setMetadata({ title: '', author: '', subject: '' });
    await openFile(picked);
  };

  useEffect(() => {
    if (!workingFile || thumbnails.length === 0) return;
    let cancelled = false;
    setPreviewLoading(true);
    renderSinglePage(workingFile, activePage, PREVIEW_SCALE)
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
  }, [workingFile, activePage, thumbnails.length]);

  useEffect(() => {
    const node = previewRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setPreviewWidth(entry.contentRect.width);
    });
    observer.observe(node);
    setPreviewWidth(node.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, [pagePreview]);

  // Delete removes the selection and the arrows nudge it, so fine placement needs no dragging.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!selectedId || editingId) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        setElements((prev) => prev.filter((el) => el.id !== selectedId));
        setSelectedId(null);
        return;
      }
      const step = e.shiftKey ? 0.02 : 0.004;
      const delta: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const move = delta[e.key];
      if (!move) return;
      e.preventDefault();
      setElements((prev) =>
        prev.map((el) =>
          el.id === selectedId
            ? {
                ...el,
                xPct: clamp(el.xPct + move[0], 0, 1),
                yPct: clamp(el.yPct + move[1], 0, 1),
              }
            : el
        )
      );
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, editingId]);

  // The existing runs are only read when Retype is armed, so normal editing pays nothing.
  useEffect(() => {
    if (placeTool !== 'retype' || !workingFile) return;
    let cancelled = false;
    pageTextRuns(workingFile, activePage)
      .then((runs) => {
        if (!cancelled) setTextRuns(runs);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not read this page’s text.');
      });
    return () => {
      cancelled = true;
    };
  }, [placeTool, workingFile, activePage]);

  const add = (element: EditElement): void => {
    setElements((prev) => [...prev, element]);
    setSelectedId(element.id);
  };

  /** Covers an existing run and drops an editable copy on top, matched to its size and font. */
  const retype = (run: PageTextRun): void => {
    const coverId = `el-${++elementSeq}`;
    const textId = `el-${++elementSeq}`;
    setElements((prev) => [
      ...prev,
      {
        kind: 'cover',
        id: coverId,
        pageIndex: activePage,
        xPct: Math.max(0, run.xPct - 0.004),
        yPct: Math.max(0, run.yPct - 0.004),
        widthPct: Math.min(1, run.widthPct + 0.012),
        heightPct: run.heightPct,
        color: '#ffffff',
      },
      {
        kind: 'text',
        id: textId,
        pageIndex: activePage,
        xPct: run.xPct,
        yPct: run.yPct,
        text: run.text,
        fontKey: run.fontKey,
        fontSize: run.fontSize,
        color: '#111111',
        opacity: 1,
        rotation: 0,
      },
    ]);
    setSelectedId(textId);
    setEditingId(textId);
    setPlaceTool(null);
  };

  const placeAt = (xPct: number, yPct: number): void => {
    if (placeTool === 'text') {
      const id = `el-${++elementSeq}`;
      add({
        kind: 'text',
        id,
        pageIndex: activePage,
        xPct,
        yPct,
        text: 'New text',
        fontKey: 'helvetica',
        fontSize: 14,
        color: '#111111',
        opacity: 1,
        rotation: 0,
      });
      setEditingId(id);
    } else if (placeTool === 'cover') {
      add({
        kind: 'cover',
        id: `el-${++elementSeq}`,
        pageIndex: activePage,
        xPct,
        yPct,
        widthPct: 0.3,
        heightPct: 0.035,
        color: '#ffffff',
      });
    }
    setPlaceTool(null);
  };

  const addImage = (picked: File): void => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const probe = new Image();
      probe.onload = () =>
        add({
          kind: 'image',
          id: `el-${++elementSeq}`,
          pageIndex: activePage,
          xPct: 0.12,
          yPct: 0.12,
          widthPct: 0.25,
          aspect: probe.height / probe.width,
          dataUrl,
          opacity: 1,
        });
      probe.onerror = () => toast.error('Could not read that image.');
      probe.src = dataUrl;
    };
    reader.onerror = () => toast.error('Could not read that image.');
    reader.readAsDataURL(picked);
  };

  const loadWatermarkImage = (picked: File): void => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const probe = new Image();
      probe.onload = () =>
        setWatermark((w) => ({
          ...w,
          dataUrl,
          aspect: probe.height / probe.width,
        }));
      probe.onerror = () => toast.error('Could not read that image.');
      probe.src = dataUrl;
    };
    reader.onerror = () => toast.error('Could not read that image.');
    reader.readAsDataURL(picked);
  };

  const patch = (id: string, next: Partial<EditElement>): void =>
    setElements((prev) =>
      prev.map((el) =>
        el.id === id ? ({ ...el, ...next } as EditElement) : el
      )
    );

  const patchSelected = (next: Partial<EditElement>): void => {
    if (selectedId) patch(selectedId, next);
  };

  const remove = (id: string): void => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  };

  const onPointerDown = (
    e: React.PointerEvent<HTMLElement>,
    el: EditElement,
    mode: 'move' | 'resize'
  ): void => {
    if (editingId === el.id) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      id: el.id,
      mode,
      dxPct: (e.clientX - rect.left) / rect.width - el.xPct,
      dyPct: (e.clientY - rect.top) / rect.height - el.yPct,
    };
    setSelectedId(el.id);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>): void => {
    const drag = dragRef.current;
    const rect = previewRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;

    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== drag.id) return el;
        if (drag.mode === 'move')
          return {
            ...el,
            xPct: clamp(xPct - drag.dxPct, 0, 1),
            yPct: clamp(yPct - drag.dyPct, 0, 1),
          };
        if (el.kind === 'text')
          return {
            ...el,
            fontSize: clamp(
              Math.round(((yPct - el.yPct) * (size?.height ?? 800)) / 1.2),
              6,
              200
            ),
          };
        if (el.kind === 'cover')
          return {
            ...el,
            widthPct: clamp(xPct - el.xPct, 0.01, 1 - el.xPct),
            heightPct: clamp(yPct - el.yPct, 0.005, 1 - el.yPct),
          };
        return { ...el, widthPct: clamp(xPct - el.xPct, 0.03, 1 - el.xPct) };
      })
    );
  };

  const endDrag = (e: React.PointerEvent<HTMLElement>): void => {
    if (!dragRef.current) return;
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const buildEdited = async (): Promise<Uint8Array | null> => {
    if (!workingFile) return null;
    return applyPdfEdits(workingFile, options);
  };

  // Bakes pending edits in so the preview shows the real render and further edits stack.
  const handleApply = async (): Promise<void> => {
    if (!workingFile) return;
    setBusy('apply');
    try {
      const bytes = await buildEdited();
      if (!bytes) return;
      const baked = new File([bytes as BlobPart], workingFile.name, {
        type: 'application/pdf',
      });
      setElements([]);
      setSelectedId(null);
      setHeader((b) => ({ ...b, enabled: false }));
      setFooter((b) => ({ ...b, enabled: false }));
      setPageNumbers((n) => ({ ...n, enabled: false }));
      setWatermark((w) => ({ ...w, enabled: false }));
      setAppliedRounds((n) => n + 1);
      await openFile(baked, true);
      toast.success('Changes applied — keep editing or download');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not apply.');
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadPdf = async (): Promise<void> => {
    if (!sourceFile || !workingFile) return;
    setBusy('pdf');
    try {
      const bytes = await buildEdited();
      if (!bytes) return;
      downloadBytes(
        bytes,
        `${sourceFile.name.replace(/\.pdf$/i, '')}-edited.pdf`
      );
      toast.success('Edited PDF downloaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not export.');
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadDocx = async (): Promise<void> => {
    if (!sourceFile || !workingFile) return;
    setBusy('docx');
    try {
      // Converts what is on screen now, so applied edits are included.
      const result = await pdfToDocx(workingFile, {
        title: metadata.title || sourceFile.name.replace(/\.pdf$/i, ''),
        // Pages that already carry text never reach OCR, so this can stay on.
        ocr: {
          onProgress: (p) =>
            setOcrStatus(
              `Reading page ${p.page}/${p.totalPages} — ${p.status} ${Math.round(p.progress * 100)}%`
            ),
        },
      });
      setOcrStatus(null);
      if (result.lineCount === 0) {
        toast.error('Nothing could be read from this PDF, even with OCR.');
        return;
      }
      downloadBytes(
        result.bytes,
        `${sourceFile.name.replace(/\.pdf$/i, '')}.docx`,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      toast.success(
        `Converted ${result.lineCount} lines to an editable .docx${
          result.ocrPages ? ` (${result.ocrPages} page(s) read by OCR)` : ''
        }`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not convert.');
    } finally {
      setBusy(null);
    }
  };

  const reset = async (): Promise<void> => {
    if (!sourceFile) return;
    setElements([]);
    setSelectedId(null);
    setAppliedRounds(0);
    setHeader(band('Company name', 'left'));
    setFooter(band('Confidential', 'center'));
    setPageNumbers(DEFAULT_NUMBERS);
    setWatermark(DEFAULT_WATERMARK);
    await openFile(sourceFile);
    toast.success('Reverted to the original file');
  };

  const bandStyle = (b: BandOptions | PageNumberOptions, top: boolean) => ({
    top: top ? `${b.margin * scale}px` : undefined,
    bottom: top ? undefined : `${b.margin * scale}px`,
    left: `${b.margin * scale}px`,
    right: `${b.margin * scale}px`,
    fontFamily: EDIT_FONT_CSS[b.fontKey],
    fontSize: `${b.fontSize * scale}px`,
    fontWeight: isBoldFont(b.fontKey) ? 700 : 400,
    color: b.color,
    textAlign: b.align,
    lineHeight: 1,
  });

  return (
    <div className="space-y-5">
      <Dropzone
        onFiles={loadFile}
        label={
          sourceFile
            ? sourceFile.name
            : 'Drop a PDF here, or click to choose a file'
        }
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
              (placed items stay on their own page)
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
        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <ToolButton
                active={placeTool === null}
                icon={<MousePointer2 className="h-3.5 w-3.5" />}
                label="Select"
                onClick={() => setPlaceTool(null)}
              />
              <ToolButton
                active={placeTool === 'text'}
                icon={<TypeIcon className="h-3.5 w-3.5" />}
                label="Text"
                onClick={() => setPlaceTool('text')}
              />
              <ToolButton
                active={placeTool === 'retype'}
                icon={<Pencil className="h-3.5 w-3.5" />}
                label="Retype"
                onClick={() => setPlaceTool('retype')}
              />
              <ToolButton
                active={placeTool === 'cover'}
                icon={<Square className="h-3.5 w-3.5" />}
                label="Cover"
                onClick={() => setPlaceTool('cover')}
              />
              <ToolButton
                icon={<ImageIcon className="h-3.5 w-3.5" />}
                label="Image"
                onClick={() => imageInputRef.current?.click()}
              />
              {appliedRounds > 0 && (
                <button
                  type="button"
                  onClick={() => void reset()}
                  className="ml-auto flex items-center gap-1.5 text-2xs text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Undo2 className="h-3.5 w-3.5" /> Revert to original
                </button>
              )}
            </div>

            <p className="mb-1.5 text-2xs text-muted-foreground/70">
              {placeTool
                ? placeTool === 'retype'
                  ? 'Click any highlighted line to cover it and retype it in place.'
                  : `Click anywhere on the page to place the ${placeTool}.`
                : 'Drag to move · double-click text to retype · corner handle resizes · Delete removes · arrow keys nudge.'}
            </p>

            <div
              ref={previewRef}
              onPointerDown={(e) => {
                if (!placeTool) {
                  setSelectedId(null);
                  setEditingId(null);
                  return;
                }
                const rect = e.currentTarget.getBoundingClientRect();
                placeAt(
                  (e.clientX - rect.left) / rect.width,
                  (e.clientY - rect.top) / rect.height
                );
              }}
              className={cn(
                'relative overflow-hidden rounded-lg border border-border/60',
                placeTool && 'cursor-crosshair'
              )}
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

              {placeTool === 'retype' &&
                textRuns.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    title={run.text}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      retype(run);
                    }}
                    className="absolute rounded-[2px] bg-primary/15 ring-1 ring-primary/40 transition-colors hover:bg-primary/30"
                    style={{
                      left: `${run.xPct * 100}%`,
                      top: `${run.yPct * 100}%`,
                      width: `${run.widthPct * 100}%`,
                      height: `${run.heightPct * 100}%`,
                    }}
                  />
                ))}

              {/* Document-wide bands are previewed with the same geometry the export uses. */}
              {header.enabled &&
                !(header.skipFirstPage && activePage === 0) &&
                header.text && (
                  <div
                    className="pointer-events-none absolute whitespace-pre"
                    style={bandStyle(header, true)}
                  >
                    {header.text}
                  </div>
                )}
              {footer.enabled &&
                !(footer.skipFirstPage && activePage === 0) &&
                footer.text && (
                  <div
                    className="pointer-events-none absolute whitespace-pre"
                    style={bandStyle(footer, false)}
                  >
                    {footer.text}
                  </div>
                )}
              {pageNumbers.enabled &&
                !(pageNumbers.skipFirstPage && activePage === 0) && (
                  <div
                    className="pointer-events-none absolute whitespace-pre"
                    style={bandStyle(
                      pageNumbers,
                      pageNumbers.position === 'top'
                    )}
                  >
                    {pageNumbers.format
                      .replaceAll(
                        '{n}',
                        String(activePage + pageNumbers.startAt)
                      )
                      .replaceAll('{total}', String(thumbnails.length))}
                  </div>
                )}
              {watermark.enabled &&
                (watermark.mode === 'image'
                  ? watermark.dataUrl
                  : watermark.text) && (
                  <div
                    className="pointer-events-none absolute inset-0 grid place-items-center"
                    style={{ opacity: watermark.opacity }}
                  >
                    {watermark.mode === 'image' ? (
                      <img
                        src={watermark.dataUrl}
                        alt=""
                        style={{
                          width: `${watermark.widthPct * 100}%`,
                          transform: `rotate(${-watermark.rotation}deg)`,
                        }}
                      />
                    ) : (
                      <span
                        className="whitespace-pre"
                        style={{
                          fontFamily: EDIT_FONT_CSS[watermark.fontKey],
                          fontSize: `${watermark.fontSize * scale}px`,
                          fontWeight: isBoldFont(watermark.fontKey) ? 700 : 400,
                          color: watermark.color,
                          transform: `rotate(${-watermark.rotation}deg)`,
                        }}
                      >
                        {watermark.text}
                      </span>
                    )}
                  </div>
                )}

              {pageElements.map((el) => {
                const active = el.id === selectedId;
                const isEditing = editingId === el.id;
                return (
                  <div
                    key={el.id}
                    onPointerDown={(e) => onPointerDown(e, el, 'move')}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (el.kind === 'text') setEditingId(el.id);
                    }}
                    className={cn(
                      'absolute touch-none',
                      isEditing ? 'cursor-text' : 'cursor-move',
                      active && 'outline outline-1 outline-primary'
                    )}
                    style={{
                      left: `${el.xPct * 100}%`,
                      top: `${el.yPct * 100}%`,
                      ...(el.kind === 'text'
                        ? {
                            fontFamily: EDIT_FONT_CSS[el.fontKey],
                            fontSize: `${el.fontSize * scale}px`,
                            lineHeight: 1.2,
                            fontWeight: isBoldFont(el.fontKey) ? 700 : 400,
                            fontStyle: isItalicFont(el.fontKey)
                              ? 'italic'
                              : 'normal',
                            color: el.color,
                            opacity: el.opacity,
                            transform: `rotate(${-el.rotation}deg)`,
                            transformOrigin: 'top left',
                            whiteSpace: 'pre',
                          }
                        : {
                            width: `${el.widthPct * 100}%`,
                            ...(el.kind === 'cover'
                              ? {
                                  height: `${el.heightPct * 100}%`,
                                  background: el.color,
                                }
                              : { opacity: el.opacity }),
                          }),
                    }}
                  >
                    {el.kind === 'text' &&
                      (isEditing ? (
                        <textarea
                          autoFocus
                          value={el.text}
                          onChange={(e) =>
                            patch(el.id, { text: e.target.value })
                          }
                          onBlur={() => setEditingId(null)}
                          data-lenis-prevent
                          onPointerDown={(e) => e.stopPropagation()}
                          rows={el.text.split('\n').length}
                          className="resize-none border border-primary bg-white/95 px-0.5 text-inherit leading-[inherit] text-black outline-none"
                          style={{
                            font: 'inherit',
                            width: `${Math.max(6, ...el.text.split('\n').map((l) => l.length))}ch`,
                          }}
                        />
                      ) : (
                        el.text
                      ))}
                    {el.kind === 'image' && (
                      <img
                        src={el.dataUrl}
                        alt=""
                        className="pointer-events-none w-full select-none"
                        draggable={false}
                      />
                    )}

                    {active && !isEditing && (
                      <span
                        onPointerDown={(e) => onPointerDown(e, el, 'resize')}
                        onPointerMove={onPointerMove}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                        className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-full border border-background bg-primary"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) addImage(picked);
                e.target.value = '';
              }}
            />

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => void handleApply()}
                disabled={!pending || busy !== null}
                variant="secondary"
                className="flex-1 py-1"
              >
                {busy === 'apply' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Apply
              </Button>
              <Button
                onClick={() => void handleDownloadPdf()}
                disabled={busy !== null || (!pending && appliedRounds === 0)}
                className="flex-1 py-1"
              >
                {busy === 'pdf' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Apply &amp; Download
              </Button>
              <Button
                onClick={() => void handleDownloadDocx()}
                disabled={busy !== null}
                variant="outline"
                className="flex-1 py-1"
              >
                {busy === 'docx' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Download as Docs
              </Button>
            </div>
            {ocrStatus && (
              <p className="mt-2 flex items-center gap-2 text-2xs text-neon">
                <Loader2 className="h-3 w-3 animate-spin" /> {ocrStatus}
              </p>
            )}

            <p className="mt-1.5 text-2xs text-muted-foreground/70">
              Apply bakes the changes in so you can keep layering. Docs exports
              the text as an editable .docx.
            </p>
          </div>

          <div className="space-y-4">
            {selected && (
              <SelectedPanel
                element={selected}
                onChange={patchSelected}
                onRemove={() => remove(selected.id)}
              />
            )}

            <BandPanel title="Header" value={header} onChange={setHeader} />
            <BandPanel title="Footer" value={footer} onChange={setFooter} />
            <NumbersPanel value={pageNumbers} onChange={setPageNumbers} />
            <WatermarkPanel
              value={watermark}
              onChange={setWatermark}
              onImage={loadWatermarkImage}
            />

            <details className="rounded-lg border border-border/60 p-3">
              <summary className="cursor-pointer text-xs font-medium text-foreground">
                Document info
              </summary>
              <div className="mt-3 space-y-2">
                {(['title', 'author', 'subject'] as const).map((key) => (
                  <input
                    key={key}
                    className="input"
                    placeholder={key[0]?.toUpperCase() + key.slice(1)}
                    value={metadata[key]}
                    onChange={(e) =>
                      setMetadata((m) => ({ ...m, [key]: e.target.value }))
                    }
                  />
                ))}
              </div>
            </details>

            {elements.length > 0 && (
              <div>
                <label className="label">Placed ({elements.length})</label>
                <ul className="space-y-1.5">
                  {elements.map((el) => (
                    <li
                      key={el.id}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors',
                        el.id === selectedId
                          ? 'border-primary/60 bg-primary/10'
                          : 'border-border/60'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActivePage(el.pageIndex);
                          setSelectedId(el.id);
                        }}
                        className="min-w-0 flex-1 truncate text-left text-2xs text-muted-foreground"
                      >
                        p{el.pageIndex + 1} ·{' '}
                        {el.kind === 'text'
                          ? el.text.slice(0, 22) || 'Text'
                          : el.kind === 'image'
                            ? 'Image'
                            : 'Cover'}
                      </button>
                      <button
                        type="button"
                        aria-label="Remove"
                        onClick={() => remove(el.id)}
                        className="rounded p-1 text-muted-foreground/70 transition-colors hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ToolButton({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors',
        active
          ? 'border-primary/60 bg-primary/10 text-primary'
          : 'border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function FontSelect({
  value,
  onChange,
}: {
  value: EditFontKey;
  onChange: (key: EditFontKey) => void;
}) {
  return (
    <select
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value as EditFontKey)}
    >
      {FONT_CHOICES.map((f) => (
        <option key={f.key} value={f.key}>
          {f.label}
        </option>
      ))}
    </select>
  );
}

function Range({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-2xs text-muted-foreground">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-10 shrink-0 rounded border border-border/60 bg-transparent"
    />
  );
}

function SelectedPanel({
  element,
  onChange,
  onRemove,
}: {
  element: EditElement;
  onChange: (patch: Partial<EditElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium capitalize text-foreground">
          {element.kind} selected
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-muted-foreground/70 transition-colors hover:text-destructive"
          aria-label="Remove element"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {element.kind === 'text' && (
        <>
          <textarea
            className="input min-h-[4rem]"
            data-lenis-prevent
            value={element.text}
            onChange={(e) => onChange({ text: e.target.value })}
          />
          <FontSelect
            value={element.fontKey}
            onChange={(fontKey) => onChange({ fontKey })}
          />
          <Range
            label={`Size ${element.fontSize}pt`}
            min={6}
            max={96}
            step={1}
            value={element.fontSize}
            onChange={(fontSize) => onChange({ fontSize })}
          />
          <Range
            label={`Rotation ${element.rotation}°`}
            min={-180}
            max={180}
            step={5}
            value={element.rotation}
            onChange={(rotation) => onChange({ rotation })}
          />
          <div className="flex items-center gap-3">
            <ColorInput
              value={element.color}
              onChange={(color) => onChange({ color })}
            />
            <div className="flex-1">
              <Range
                label={`Opacity ${Math.round(element.opacity * 100)}%`}
                min={0.05}
                max={1}
                step={0.05}
                value={element.opacity}
                onChange={(opacity) => onChange({ opacity })}
              />
            </div>
          </div>
        </>
      )}

      {element.kind === 'image' && (
        <>
          <Range
            label={`Width ${Math.round(element.widthPct * 100)}%`}
            min={0.05}
            max={1}
            step={0.01}
            value={element.widthPct}
            onChange={(widthPct) => onChange({ widthPct })}
          />
          <Range
            label={`Opacity ${Math.round(element.opacity * 100)}%`}
            min={0.05}
            max={1}
            step={0.05}
            value={element.opacity}
            onChange={(opacity) => onChange({ opacity })}
          />
        </>
      )}

      {element.kind === 'cover' && (
        <>
          <Range
            label={`Width ${Math.round(element.widthPct * 100)}%`}
            min={0.02}
            max={1}
            step={0.01}
            value={element.widthPct}
            onChange={(widthPct) => onChange({ widthPct })}
          />
          <Range
            label={`Height ${Math.round(element.heightPct * 100)}%`}
            min={0.01}
            max={1}
            step={0.005}
            value={element.heightPct}
            onChange={(heightPct) => onChange({ heightPct })}
          />
          <label className="flex items-center gap-2 text-2xs text-muted-foreground">
            Colour
            <ColorInput
              value={element.color}
              onChange={(color) => onChange({ color })}
            />
          </label>
        </>
      )}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-primary"
      />
      {label}
    </label>
  );
}

function AlignSelect({
  value,
  onChange,
}: {
  value: BandOptions['align'];
  onChange: (value: BandOptions['align']) => void;
}) {
  return (
    <select
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value as BandOptions['align'])}
    >
      <option value="left">Left</option>
      <option value="center">Center</option>
      <option value="right">Right</option>
    </select>
  );
}

function BandPanel({
  title,
  value,
  onChange,
}: {
  title: string;
  value: BandOptions;
  onChange: (value: BandOptions) => void;
}) {
  const patch = (next: Partial<BandOptions>): void =>
    onChange({ ...value, ...next });
  return (
    <div className="space-y-2 rounded-lg border border-border/60 p-3">
      <Toggle
        label={`${title} on every page`}
        checked={value.enabled}
        onChange={(enabled) => patch({ enabled })}
      />
      {value.enabled && (
        <>
          <input
            className="input"
            value={value.text}
            onChange={(e) => patch({ text: e.target.value })}
            placeholder={`${title} text`}
          />
          <div className="grid grid-cols-2 gap-2">
            <AlignSelect
              value={value.align}
              onChange={(align) => patch({ align })}
            />
            <FontSelect
              value={value.fontKey}
              onChange={(fontKey) => patch({ fontKey })}
            />
          </div>
          <Range
            label={`Size ${value.fontSize}pt`}
            min={6}
            max={32}
            step={1}
            value={value.fontSize}
            onChange={(fontSize) => patch({ fontSize })}
          />
          <Range
            label={`Margin ${value.margin}pt`}
            min={8}
            max={96}
            step={2}
            value={value.margin}
            onChange={(margin) => patch({ margin })}
          />
          <div className="flex items-center gap-3">
            <ColorInput
              value={value.color}
              onChange={(color) => patch({ color })}
            />
            <Toggle
              label="Skip first page"
              checked={value.skipFirstPage}
              onChange={(skipFirstPage) => patch({ skipFirstPage })}
            />
          </div>
        </>
      )}
    </div>
  );
}

function NumbersPanel({
  value,
  onChange,
}: {
  value: PageNumberOptions;
  onChange: (value: PageNumberOptions) => void;
}) {
  const patch = (next: Partial<PageNumberOptions>): void =>
    onChange({ ...value, ...next });
  return (
    <div className="space-y-2 rounded-lg border border-border/60 p-3">
      <Toggle
        label="Page numbers"
        checked={value.enabled}
        onChange={(enabled) => patch({ enabled })}
      />
      {value.enabled && (
        <>
          <input
            className="input"
            value={value.format}
            onChange={(e) => patch({ format: e.target.value })}
            placeholder="Page {n} of {total}"
          />
          <p className="text-2xs text-muted-foreground/70">
            {'{n}'} is the page number, {'{total}'} the page count.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <AlignSelect
              value={value.align}
              onChange={(align) => patch({ align })}
            />
            <select
              className="input"
              value={value.position}
              onChange={(e) =>
                patch({ position: e.target.value as 'top' | 'bottom' })
              }
            >
              <option value="bottom">Bottom</option>
              <option value="top">Top</option>
            </select>
          </div>
          <Range
            label={`Size ${value.fontSize}pt`}
            min={6}
            max={24}
            step={1}
            value={value.fontSize}
            onChange={(fontSize) => patch({ fontSize })}
          />
          <Range
            label={`Margin ${value.margin}pt`}
            min={8}
            max={96}
            step={2}
            value={value.margin}
            onChange={(margin) => patch({ margin })}
          />
          <label className="block text-2xs text-muted-foreground">
            Start numbering at
            <input
              type="number"
              min={0}
              className="input mt-1"
              value={value.startAt}
              onChange={(e) => patch({ startAt: Number(e.target.value) || 0 })}
            />
          </label>
          <Toggle
            label="Skip first page"
            checked={value.skipFirstPage}
            onChange={(skipFirstPage) => patch({ skipFirstPage })}
          />
        </>
      )}
    </div>
  );
}

function WatermarkPanel({
  value,
  onChange,
  onImage,
}: {
  value: WatermarkOptions;
  onChange: (value: WatermarkOptions) => void;
  onImage: (file: File) => void;
}) {
  const markInputRef = useRef<HTMLInputElement>(null);
  const patch = (next: Partial<WatermarkOptions>): void =>
    onChange({ ...value, ...next });
  return (
    <div className="space-y-2 rounded-lg border border-border/60 p-3">
      <Toggle
        label="Watermark on every page"
        checked={value.enabled}
        onChange={(enabled) => patch({ enabled })}
      />
      {value.enabled && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => patch({ mode: 'text' })}
              className={cn(
                'rounded-lg border px-2 py-1.5 text-2xs transition-colors',
                value.mode === 'text'
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border/60 text-muted-foreground'
              )}
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => patch({ mode: 'image' })}
              className={cn(
                'rounded-lg border px-2 py-1.5 text-2xs transition-colors',
                value.mode === 'image'
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border/60 text-muted-foreground'
              )}
            >
              Image
            </button>
          </div>

          {value.mode === 'image' ? (
            <>
              <button
                type="button"
                onClick={() => markInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-border/70 p-3 text-center transition-colors hover:border-primary/40"
              >
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xs text-foreground">
                  {value.dataUrl
                    ? 'Change stamp image'
                    : 'Choose a logo or stamp'}
                </span>
              </button>
              <input
                ref={markInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const picked = e.target.files?.[0];
                  if (picked) onImage(picked);
                  e.target.value = '';
                }}
              />
              <Range
                label={`Width ${Math.round(value.widthPct * 100)}%`}
                min={0.1}
                max={1}
                step={0.02}
                value={value.widthPct}
                onChange={(widthPct) => patch({ widthPct })}
              />
            </>
          ) : (
            <>
              <input
                className="input"
                value={value.text}
                onChange={(e) => patch({ text: e.target.value })}
                placeholder="Watermark text"
              />
              <FontSelect
                value={value.fontKey}
                onChange={(fontKey) => patch({ fontKey })}
              />
              <Range
                label={`Size ${value.fontSize}pt`}
                min={12}
                max={160}
                step={2}
                value={value.fontSize}
                onChange={(fontSize) => patch({ fontSize })}
              />
            </>
          )}
          <Range
            label={`Rotation ${value.rotation}°`}
            min={-90}
            max={90}
            step={5}
            value={value.rotation}
            onChange={(rotation) => patch({ rotation })}
          />
          <div className="flex items-center gap-3">
            <ColorInput
              value={value.color}
              onChange={(color) => patch({ color })}
            />
            <div className="flex-1">
              <Range
                label={`Opacity ${Math.round(value.opacity * 100)}%`}
                min={0.05}
                max={1}
                step={0.05}
                value={value.opacity}
                onChange={(opacity) => patch({ opacity })}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
