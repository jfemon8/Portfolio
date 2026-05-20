import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PdfPreviewModal from '@/components/shared/PdfPreviewModal';
import { useSiteCopy } from '@/hooks/useSiteCopy';

interface ResumeViewerProps {
  /** Cloudinary URL of the resume PDF; pass profile.resumeUrl. Returns null
   *  when empty so callers can spread it conditionally without a guard. */
  url?: string;
  /** Overrides the button label (defaults to site-copy `hero.ctaViewResume`,
   *  falling back to "View Resume"). */
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Reserved for future analytics — not wired right now since the
   *  `VisitType` union doesn't yet include a "resume_view" event. */
  trackSource?: string;
}

/**
 * Public-side "View Resume" affordance — opens the lazy `PdfPreviewModal`
 * with the full PDF viewer (zoom, page jump, fullscreen, download from the
 * toolbar). Returns nothing when `url` is empty, so callers can render it
 * unconditionally and it self-hides until the admin uploads a resume.
 */
export default function ResumeViewer({
  url,
  label,
  variant = 'default',
  size = 'md',
  className,
}: ResumeViewerProps) {
  const [open, setOpen] = useState(false);
  const copy = useSiteCopy('hero', { ctaViewResume: 'View Resume' });
  if (!url) return null;
  const text = label ?? copy.ctaViewResume;
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Eye className="h-4 w-4" /> {text}
      </Button>
      <PdfPreviewModal
        target={open ? { fileUrl: url, title: 'Resume' } : null}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
