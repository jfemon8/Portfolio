import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PdfPreviewModal from '@/components/shared/PdfPreviewModal';
import { useSiteCopy } from '@/hooks/useSiteCopy';

interface ResumeViewerProps {
  /** Cloudinary URL of the resume PDF (profile.resumeUrl); component renders null when empty so callers can use it unconditionally. */
  url?: string;
  /** Overrides the button label; defaults to site-copy hero.ctaViewResume, falling back to "View Resume". */
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Reserved for future analytics; not wired yet since VisitType doesn't include a "resume_view" event. */
  trackSource?: string;
}

// Renders nothing when url is empty, so it self-hides until the admin uploads a resume.
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
