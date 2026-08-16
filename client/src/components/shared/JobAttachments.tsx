import { useState } from 'react';
import { FileText, Image as ImageIcon, Maximize2 } from 'lucide-react';
import Lightbox from '@/components/shared/Lightbox';
import PdfPreviewModal, {
  type PdfPreviewTarget,
} from '@/components/shared/PdfPreviewModal';
import SmartImage from '@/components/shared/SmartImage';
import GlassCard from '@/components/shared/GlassCard';
import type { JobAttachment } from '@/types';

/** A scanned circular IS the posting, so it renders inline and zoomable, never as a bare link. */
export default function JobAttachments({
  attachments,
  title,
}: {
  attachments: JobAttachment[];
  title: string;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [pdfTarget, setPdfTarget] = useState<PdfPreviewTarget | null>(null);

  const images = attachments.filter((item) => item.type === 'image');
  const pdfs = attachments.filter((item) => item.type === 'pdf');
  if (!attachments.length) return null;

  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
        <ImageIcon className="h-5 w-5 text-neon" />
        Official circular
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Published by the source as a scanned notice. Tap to zoom and read the
        full details.
      </p>

      {images.length > 0 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {images.map((item, index) => (
            <button
              key={item.url}
              type="button"
              onClick={() => setLightboxIndex(index)}
              aria-label={`Open ${item.label || 'circular'} full screen`}
              className="group relative block overflow-hidden rounded-xl border border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <SmartImage
                src={item.url}
                alt={item.label || `${title} circular`}
                imgWidth={720}
                className="max-h-[28rem] w-full bg-card/40 object-contain transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-background/80 text-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                <Maximize2 className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>
      )}

      {pdfs.length > 0 && (
        <div className="mt-4 space-y-3">
          {pdfs.map((item) => (
            <GlassCard key={item.url} className="p-4">
              <button
                type="button"
                onClick={() =>
                  setPdfTarget({
                    fileUrl: item.url,
                    title: item.label || title,
                  })
                }
                className="flex w-full items-center gap-3 text-left"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-neon">
                  <FileText className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">
                    {item.label || 'Notice (PDF)'}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Open the PDF viewer
                  </span>
                </span>
                <Maximize2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </GlassCard>
          ))}
        </div>
      )}

      <Lightbox
        images={images.map((item) => ({
          url: item.url,
          caption: item.label || title,
        }))}
        open={lightboxIndex !== null}
        startIndex={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
      />
      <PdfPreviewModal target={pdfTarget} onClose={() => setPdfTarget(null)} />
    </section>
  );
}
