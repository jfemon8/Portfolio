import { useEffect, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
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

  // Portal to <body> so the fixed-positioned overlay escapes any ancestor
  // that has a CSS `transform` (e.g. `<Reveal>` from About, motion.div
  // wrappers anywhere). Without the portal, `position: fixed` is anchored
  // to the nearest transformed ancestor — and on the About page that
  // squeezed the modal into the right column instead of filling the
  // viewport. The admin `<Modal>` already uses this same pattern.
  return createPortal(
    <AnimatePresence>
      {target && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          // `data-lenis-prevent` makes the smooth-scroll provider
          // (PublicLayout wraps everything in <SmoothScroll>/Lenis) bypass
          // wheel + touch events within this subtree, so the PDF
          // container's native `overflow-auto` actually receives them and
          // scrolls. Without this, Lenis swallows the wheel at the
          // document level and moves the background page instead — which
          // is what the admin shell never had (no Lenis there) and why
          // the same modal worked perfectly inside /admin.
          data-lenis-prevent
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
            // BOUNDED HEIGHT card — PdfViewer's `h-full` now fills exactly
            // this. 92% of viewport height (capped at 960 px on huge
            // monitors). Without this height bound, the viewer's
            // `flex-1 min-h-0` scroll area would have no defined parent
            // height and either collapse to zero or expand past the
            // viewport (which is what blocked scrolling before).
            className="relative flex h-[92vh] max-h-[960px] w-full max-w-5xl flex-col"
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
