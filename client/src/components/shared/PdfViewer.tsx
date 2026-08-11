import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { usePinch } from '@use-gesture/react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  ZoomIn,
  ZoomOut,
  Download,
  Loader2,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  FileX,
  RotateCw,
  FileText,
} from 'lucide-react';

import { proxyFileUrl } from '@/lib/fileProxy';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — Vite handles the ?url suffix at build time
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfViewerProps {
  url: string;
  fileName?: string;
  allowFullscreen?: boolean;
}

// Loads the PDF URL directly since Cloudinary serves `.pdf` public_ids with the correct `application/pdf` Content-Type.
export default function PdfViewer({
  url,
  fileName,
  allowFullscreen = true,
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [numPages, setNumPages] = useState(0);
  const [visiblePage, setVisiblePage] = useState(1);
  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(800);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [showPageInput, setShowPageInput] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const pageInputRef = useRef<HTMLInputElement>(null);

  // Proxied because Cloudinary raw assets serve `application/octet-stream`, breaking inline preview and filename-keeping downloads.
  const displayName =
    fileName || url.split('/').pop()?.split('?')[0] || 'document.pdf';

  // Downloads need an extension for the OS to identify the file type, so keep displayName's if present, else fall back to the URL's (or `.pdf`).
  const urlExtMatch = url.match(/\.([a-z0-9]{1,8})(?:$|\?)/i);
  const urlExt = urlExtMatch ? `.${urlExtMatch[1]}` : '.pdf';
  const downloadName = /\.[a-z0-9]{1,8}$/i.test(displayName)
    ? displayName
    : `${displayName}${urlExt}`;

  const viewUrl = useMemo(
    () => proxyFileUrl(url, downloadName, true),
    [url, downloadName]
  );
  const downloadHref = useMemo(
    () => proxyFileUrl(url, downloadName, false),
    [url, downloadName]
  );

  // ── Container width tracking ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setContainerWidth(w);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Visible page tracking via IntersectionObserver ──
  useEffect(() => {
    if (numPages === 0) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { page: number; ratio: number } | null = null;
        for (const entry of entries) {
          const page = Number((entry.target as HTMLElement).dataset.page);
          if (!isNaN(page) && entry.intersectionRatio > (best?.ratio ?? 0)) {
            best = { page, ratio: entry.intersectionRatio };
          }
        }
        if (best) setVisiblePage(best.page);
      },
      { root: el, threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    pageRefs.current.forEach((div) => observer.observe(div));
    return () => observer.disconnect();
  }, [numPages]);

  // ── Pinch-to-zoom + 2-finger pan (touch devices) ── scaleRef keeps each new pinch in sync with the toolbar/keyboard.
  const scaleRef = useRef(scale);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  // Live-preview zoom/pan via CSS transform on contentRef during the gesture, commit to real setScale + scroll only on release — calling setScale() per pinch tick raced react-pdf's async re-rasterization against scrollLeft/scrollTop writes, which is what broke post-pinch scrolling.
  interface PinchMemo {
    startScale: number;
    originX: number;
    originY: number;
    lastOx: number;
    lastOy: number;
    panX: number;
    panY: number;
  }
  usePinch(
    (state) => {
      const { origin, first, last } = state;
      const [ox, oy] = origin;
      const [s] = state.offset;
      const el = containerRef.current;
      const content = contentRef.current;
      if (!el || !content) return state.memo as PinchMemo | undefined;

      const m: PinchMemo = first
        ? {
            startScale: scaleRef.current,
            // Content-local (scroll-adjusted) coordinates so transform-origin stays anchored under the fingers.
            originX: ox - el.getBoundingClientRect().left + el.scrollLeft,
            originY: oy - el.getBoundingClientRect().top + el.scrollTop,
            lastOx: ox,
            lastOy: oy,
            panX: 0,
            panY: 0,
          }
        : (state.memo as PinchMemo);

      m.panX += ox - m.lastOx;
      m.panY += oy - m.lastOy;
      m.lastOx = ox;
      m.lastOy = oy;

      const liveFactor = s / m.startScale;
      content.style.transformOrigin = `${m.originX}px ${m.originY}px`;
      content.style.transform = `translate(${m.panX}px, ${m.panY}px) scale(${liveFactor})`;

      if (last) {
        // Clear before setScale — the real re-render is async, so a brief un-zoomed flash beats double-scaling.
        content.style.transform = 'none';
        content.style.transformOrigin = '';
        el.scrollLeft -= m.panX;
        el.scrollTop -= m.panY;
        setScale(+Math.min(2.5, Math.max(0.5, s)).toFixed(2));
      }

      return m;
    },
    {
      target: containerRef,
      eventOptions: { passive: false },
      scaleBounds: { min: 0.5, max: 2.5 },
      rubberband: true,
      from: () => [scaleRef.current, 0],
    }
  );

  // ── Click-and-hold to pan (mouse) ── plain mouse events, not Pointer Events, which Chromium cancels mid-drag.
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let active = false;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;
    const onMouseDown = (e: MouseEvent): void => {
      if (e.button !== 0) return;
      active = true;
      startX = e.clientX;
      startY = e.clientY;
      startScrollLeft = el.scrollLeft;
      startScrollTop = el.scrollTop;
      setDragging(true);
      e.preventDefault();
    };
    // Recomputed from the fixed start reference each tick so it self-corrects once react-pdf's post-zoom re-render catches up.
    const onMouseMove = (e: MouseEvent): void => {
      if (!active) return;
      el.scrollLeft = startScrollLeft - (e.clientX - startX);
      el.scrollTop = startScrollTop - (e.clientY - startY);
    };
    const onMouseUp = (): void => {
      if (!active) return;
      active = false;
      setDragging(false);
    };
    const onDragStart = (e: DragEvent): void => e.preventDefault();
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('dragstart', onDragStart);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('dragstart', onDragStart);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (
        !fullscreen &&
        !wrapperRef.current?.contains(document.activeElement) &&
        document.activeElement !== document.body
      )
        return;

      switch (e.key) {
        case 'Escape':
          if (fullscreen) {
            setFullscreen(false);
            e.preventDefault();
          }
          break;
        case '+':
        case '=':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomIn();
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomOut();
          }
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            resetZoom();
          }
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fullscreen]);

  // ── Document callbacks ──
  const onDocumentLoadSuccess = useCallback(
    ({ numPages: total }: { numPages: number }) => {
      setNumPages(total);
      setError(null);
    },
    []
  );
  const onDocumentLoadError = useCallback((err: Error) => {
    console.error('[PdfViewer] Failed to load PDF:', err);
    setError(err.message || 'Failed to load PDF');
  }, []);

  // ── Zoom helpers ──
  const zoomIn = (): void =>
    setScale((s) => Math.min(2.5, +(s + 0.25).toFixed(2)));
  const zoomOut = (): void =>
    setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)));
  const resetZoom = (): void => setScale(1);

  // ── Page navigation ──
  const scrollToPage = (p: number): void => {
    const clamped = Math.max(1, Math.min(numPages, p));
    const div = pageRefs.current.get(clamped);
    if (div) div.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const submitPageInput = (): void => {
    const n = parseInt(pageInput, 10);
    if (n >= 1 && n <= numPages) scrollToPage(n);
    setShowPageInput(false);
    setPageInput('');
  };
  useEffect(() => {
    if (showPageInput) pageInputRef.current?.focus();
  }, [showPageInput]);

  // ── Computed dimensions ──
  const pageWidth = Math.min(containerWidth - 48, 1200) * scale;

  return (
    <div
      ref={wrapperRef}
      tabIndex={-1}
      // `flex-1 min-h-0` lets the pane shrink below its content size, which nested `overflow-auto` needs to actually scroll.
      className={`flex h-full select-none flex-col overflow-hidden rounded-xl border border-border bg-card outline-none ${
        fullscreen ? 'fixed inset-0 z-[100] rounded-none border-0' : ''
      }`}
    >
      {/* ── Toolbar ── */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <FileText className="hidden h-4 w-4 shrink-0 text-red-500 sm:block" />
          <span
            className="hidden max-w-[7.5rem] truncate text-xs font-medium text-foreground sm:block sm:max-w-[12.5rem] sm:text-sm lg:max-w-[18.75rem]"
            title={displayName}
          >
            {displayName}
          </span>
          <div className="hidden h-4 w-px bg-border sm:block" />

          {showPageInput ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitPageInput();
              }}
              className="flex items-center gap-1"
            >
              <input
                ref={pageInputRef}
                type="number"
                min={1}
                max={numPages}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={submitPageInput}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowPageInput(false);
                    setPageInput('');
                  }
                }}
                // `focus-visible:ring-offset-0` cancels the global ring-offset (index.css) so it doesn't compound with this input's own focus ring.
                className="w-14 rounded-md border border-border bg-background px-2 py-1 text-center text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus-visible:ring-offset-0"
              />
              <span className="text-xs text-muted-foreground">
                of {numPages}
              </span>
            </form>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => scrollToPage(visiblePage - 1)}
                disabled={visiblePage <= 1}
                className="hidden rounded p-1 text-foreground hover:bg-accent disabled:opacity-30 sm:flex"
                aria-label="Previous page"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPageInput(true);
                  setPageInput(String(visiblePage));
                }}
                className="rounded-md px-2 py-1 text-center text-xs tabular-nums text-muted-foreground hover:bg-accent"
                title="Click to jump to a page"
              >
                {numPages > 0 ? (
                  <>
                    <span className="font-medium text-foreground">
                      {visiblePage}
                    </span>{' '}
                    of {numPages}
                  </>
                ) : (
                  '—'
                )}
              </button>
              <button
                type="button"
                onClick={() => scrollToPage(visiblePage + 1)}
                disabled={visiblePage >= numPages}
                className="hidden rounded p-1 text-foreground hover:bg-accent disabled:opacity-30 sm:flex"
                aria-label="Next page"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="rounded-lg p-1.5 text-foreground hover:bg-accent disabled:opacity-30 sm:p-2"
            aria-label="Zoom out (Ctrl+-)"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="min-w-[2.5rem] rounded-md px-1.5 py-1 text-center text-2xs tabular-nums text-muted-foreground hover:bg-accent"
            title="Reset zoom (Ctrl+0)"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            onClick={zoomIn}
            disabled={scale >= 2.5}
            className="rounded-lg p-1.5 text-foreground hover:bg-accent disabled:opacity-30 sm:p-2"
            aria-label="Zoom in (Ctrl++)"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {scale !== 1 && (
            <button
              type="button"
              onClick={resetZoom}
              className="rounded-lg p-1.5 text-foreground hover:bg-accent sm:p-2"
              aria-label="Fit to width"
              title="Fit to width"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          )}
          {allowFullscreen && (
            <button
              type="button"
              onClick={() => setFullscreen((v) => !v)}
              className="rounded-lg p-1.5 text-foreground hover:bg-accent sm:p-2"
              aria-label={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
              title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
            >
              {fullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          )}
          <a
            href={downloadHref}
            download={downloadName}
            className="rounded-lg p-1.5 text-foreground hover:bg-accent sm:p-2"
            aria-label="Download PDF"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* ── Scrollable document ── */}
      {/* pointer-events-none on the text/annotation layers while dragging stops native text selection from fighting the pan. */}
      <div
        ref={containerRef}
        className={`min-h-0 flex-1 touch-pan-y overflow-auto overscroll-contain bg-muted/20 ${
          dragging
            ? 'cursor-grabbing [&_.annotationLayer]:pointer-events-none [&_.textLayer]:pointer-events-none'
            : 'cursor-grab'
        }`}
      >
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-sm text-muted-foreground">
            <FileX className="h-14 w-14 opacity-40" />
            <p className="text-lg font-semibold text-foreground">
              Could not load PDF
            </p>
            <p className="max-w-md text-center text-xs">{error}</p>
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 rounded-lg bg-primary px-5 py-2.5 text-sm text-primary-foreground hover:bg-primary/90"
            >
              Open in new tab
            </a>
          </div>
        ) : (
          // Live pinch transform target — kept separate from containerRef so it never fights the container's own scroll/overflow.
          <div ref={contentRef}>
            <Document
              file={viewUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Loading PDF...
                  </p>
                </div>
              }
              error={
                <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
                  Failed to load PDF.
                </div>
              }
              className="py-2"
            >
              {Array.from({ length: numPages }, (_, i) => i + 1).map(
                (pageNum) => (
                  <div
                    key={pageNum}
                    data-page={pageNum}
                    ref={(el) => {
                      if (el) pageRefs.current.set(pageNum, el);
                    }}
                    className="relative mx-auto mb-4 w-fit last:mb-0"
                  >
                    <div className="overflow-hidden rounded-sm shadow-lg ring-1 ring-black/5 dark:ring-white/5 sm:shadow-xl">
                      <Page
                        pageNumber={pageNum}
                        width={pageWidth}
                        renderAnnotationLayer={true}
                        renderTextLayer={true}
                      />
                    </div>
                    {numPages > 1 && (
                      <div className="mt-2 flex justify-center">
                        <span className="text-3xs tabular-nums text-muted-foreground/50 sm:text-2xs">
                          {pageNum}
                        </span>
                      </div>
                    )}
                  </div>
                )
              )}
            </Document>
          </div>
        )}
      </div>
    </div>
  );
}
