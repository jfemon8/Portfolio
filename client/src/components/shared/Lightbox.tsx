import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import SmartImage from '@/components/shared/SmartImage';

export interface LightboxImage {
  url: string;
  caption?: string;
}

/** Optional extra action shown in the modal chrome (e.g. a "Verify" link). */
export interface LightboxAction {
  href: string;
  label: string;
}

interface LightboxProps {
  images: LightboxImage[];
  open: boolean;
  startIndex?: number;
  action?: LightboxAction;
  onClose: () => void;
}

export default function Lightbox({
  images,
  open,
  startIndex = 0,
  action,
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

  // Portalled to <body>: fixed positioning otherwise anchors to a transformed Reveal/motion ancestor.
  return createPortal(
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
          // Without data-lenis-prevent, wheel/touch on the overlay bubbles to the document and Lenis scrolls the page beneath instead.
          data-lenis-prevent
          // Own compositing layer: without it, TransformComponent's transform makes Chromium paint the blur over the image.
          style={{
            willChange: 'backdrop-filter, transform',
            transform: 'translateZ(0)',
          }}
          className="fixed inset-0 z-[70] grid place-items-center bg-background/90 p-4 backdrop-blur-[1.875rem] backdrop-saturate-150 backdrop-brightness-105 sm:p-8"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="glass-thin absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-xl text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <X className="h-5 w-5" />
          </button>

          {action && (
            <a
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="glass-thin absolute left-4 top-4 z-10 inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              {action.label} <ExternalLink className="h-4 w-4" />
            </a>
          )}

          {/* z-10 keeps these above the figure, whose transform would otherwise paint over them once the image fills the width. */}
          {many && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation();
                  setI((v) => (v - 1 + images.length) % images.length);
                }}
                className="glass-thin absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-foreground shadow-lg transition-colors hover:border-primary/50 hover:text-primary sm:left-6"
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
                className="glass-thin absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-foreground shadow-lg transition-colors hover:border-primary/50 hover:text-primary sm:right-6"
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
            className="w-full max-w-5xl"
          >
            <TransformWrapper
              initialScale={1}
              minScale={1}
              maxScale={4}
              centerOnInit
              centerZoomedOut
              doubleClick={{ mode: 'toggle' }}
              // One finger drags the image only once it is zoomed in, so a swipe on a fitted image still reaches the page.
              panning={{ velocityDisabled: true, disabled: false }}
              wheel={{ step: 0.2 }}
              pinch={{ step: 5 }}
            >
              {/* The wrapper fills the slot and the content centres inside it, otherwise a short image sits against the top-left. */}
              <TransformComponent
                wrapperStyle={{
                  width: '100%',
                  height: '72vh',
                  maxWidth: '100%',
                  // Without its own touch-action the browser claims the gesture and the two-finger pinch never fires.
                  touchAction: 'none',
                }}
                contentStyle={{
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Fills the slot and letterboxes inside it, so portrait and landscape both sit centred at their true aspect. */}
                <SmartImage
                  src={img.url}
                  alt={img.caption || `Image ${i + 1}`}
                  priority
                  imgWidth={1600}
                  className="h-full max-h-full w-full max-w-full rounded-xl border border-border/70 object-contain"
                />
              </TransformComponent>
            </TransformWrapper>
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
    </AnimatePresence>,
    document.body
  );
}
