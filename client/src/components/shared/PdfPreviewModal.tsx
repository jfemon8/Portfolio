import { useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2 } from 'lucide-react';

// PdfViewer drags in react-pdf + its worker (~600 KB). Lazy-loading keeps
// the main bundle weightless until a visitor actually opens a preview.
const PdfViewer = lazy(() => import('./PdfViewer'));

export interface PdfPreviewTarget {
  fileUrl: string;
  title?: string;
}

/**
 * Project-wide PDF preview modal (ported from RDSWA). Wraps the
 * lazy-loaded PdfViewer in an animated dialog with backdrop blur,
 * click-outside / Escape / X to close, and a Suspense fallback while
 * the viewer chunk loads. Pass `null` to close.
 */
export default function PdfPreviewModal({
  target,
  onClose,
}: {
  target: PdfPreviewTarget | null;
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

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-5xl"
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
            <Suspense
              fallback={
                <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-24 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading PDF
                  viewer…
                </div>
              }
            >
              <PdfViewer
                url={target.fileUrl}
                fileName={target.title}
                height={720}
              />
            </Suspense>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
