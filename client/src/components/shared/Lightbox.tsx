import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import SmartImage from '@/components/shared/SmartImage';

export interface LightboxImage {
  url: string;
  caption?: string;
}

interface LightboxProps {
  images: LightboxImage[];
  open: boolean;
  startIndex?: number;
  onClose: () => void;
}

/**
 * Accessible image lightbox (project rule #3). Esc / backdrop / × close,
 * ← / → (or on-screen arrows) navigate, body scroll-locked while open.
 * Motion.dev only; reduced-motion-safe.
 */
export default function Lightbox({
  images,
  open,
  startIndex = 0,
  onClose,
}: LightboxProps) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(startIndex);

  useEffect(() => {
    if (open) setI(startIndex);
  }, [open, startIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setI((v) => (v + 1) % images.length);
      else if (e.key === 'ArrowLeft')
        setI((v) => (v - 1 + images.length) % images.length);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, images.length, onClose]);

  const img = images[i];
  const many = images.length > 1;

  return (
    <AnimatePresence>
      {open && img && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          // `data-lenis-prevent` — Lightbox is opened from public routes
          // (e.g. ProjectDetail gallery) where PublicLayout wraps everything
          // in <SmoothScroll>/Lenis. Without this, wheel + touch events on
          // the overlay bubble to the document, and Lenis hijacks them to
          // scroll the page beneath instead of staying contained. Same
          // pattern as PdfPreviewModal.
          data-lenis-prevent
          className="fixed inset-0 z-[70] grid place-items-center bg-background/90 p-4 backdrop-blur-xl sm:p-8"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-xl border border-border/70 bg-card/60 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <X className="h-5 w-5" />
          </button>

          {many && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation();
                  setI((v) => (v - 1 + images.length) % images.length);
                }}
                className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-border/70 bg-card/60 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary sm:left-6"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation();
                  setI((v) => (v + 1) % images.length);
                }}
                className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-border/70 bg-card/60 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary sm:right-6"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <motion.figure
            key={i}
            initial={reduce ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="max-w-5xl"
          >
            <SmartImage
              src={img.url}
              alt={img.caption || `Image ${i + 1}`}
              priority
              imgWidth={1600}
              className="mx-auto max-h-[80vh] w-auto rounded-xl border border-border/70 object-contain"
            />
            {img.caption && (
              <figcaption className="mt-3 text-center text-sm text-muted-foreground/80">
                {img.caption}
              </figcaption>
            )}
            {many && (
              <p className="mt-1 text-center text-xs text-muted-foreground/60">
                {i + 1} / {images.length}
              </p>
            )}
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
