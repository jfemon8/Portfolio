import { useEffect, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, ExternalLink } from 'lucide-react';

// PdfViewer drags in react-pdf + its worker (~600 KB); lazy-load so the main bundle stays weightless until a preview is opened.
const PdfViewer = lazy(() => import('./PdfViewer'));

export interface PdfPreviewTarget {
  fileUrl: string;
  title?: string;
}

/** Optional extra action shown in the modal chrome (e.g. a "Verify" link). */
export interface PdfPreviewAction {
  href: string;
  label: string;
}

// Ported from RDSWA; fully controlled by `target` — pass `null` to close.
export default function PdfPreviewModal({
  target,
  action,
  onClose,
}: {
  target: PdfPreviewTarget | null;
  action?: PdfPreviewAction;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!target) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [target, onClose]);

  // Portal to <body>: position:fixed anchors to the nearest transformed ancestor (e.g. Reveal/motion.div wrappers), else the modal gets squeezed into a page column.
  return createPortal(
    <AnimatePresence>
      {target && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          // data-lenis-prevent stops the Lenis smooth-scroll provider from swallowing wheel/touch here, so the PDF container's overflow-auto actually scrolls.
          data-lenis-prevent
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
            // Bounded height so PdfViewer's flex-1 min-h-0 scroll area has a defined parent height instead of collapsing or overflowing.
            className="relative flex h-[92vh] max-h-[60rem] w-full max-w-5xl flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute -right-3 -top-3 z-10 rounded-full border border-border bg-background p-2 text-foreground shadow-lg hover:bg-accent sm:-right-4 sm:-top-4"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
            {action && (
              <a
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute -left-3 -top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground shadow-lg hover:bg-accent sm:-left-4 sm:-top-4"
              >
                {action.label} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <Suspense
              fallback={
                <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading PDF
                  viewer…
                </div>
              }
            >
              <PdfViewer url={target.fileUrl} fileName={target.title} />
            </Suspense>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
