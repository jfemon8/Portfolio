import { useState } from 'react';
import { UploadCloud, Loader2, X, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { proxyFileUrl } from '@/lib/fileProxy';
import { isPdfUrl } from '@/lib/media';
import type { ApiError } from '@/types';

interface UploadValue {
  url: string;
  publicId: string;
}

interface MediaUploadProps {
  value?: string;
  publicId?: string;
  onChange: (v: UploadValue) => void;
  label?: string;
  folder?: string;
}

export default function MediaUpload({
  value,
  publicId,
  onChange,
  label = 'Media',
  folder,
}: MediaUploadProps) {
  const [busy, setBusy] = useState(false);

  const handleFile = async (file?: File): Promise<void> => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post<{ url: string; publicId: string }>(
        `/upload/media${folder ? `?folder=${folder}` : ''}`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      onChange({ url: data.url, publicId: data.publicId });
      toast.success('File uploaded');
    } catch (err) {
      toast.error(
        (err as ApiError).message || 'Upload failed (is Cloudinary configured?)'
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = (): void => onChange({ url: '', publicId: '' });

  return (
    <div>
      <label className="label">{label}</label>
      {value ? (
        isPdfUrl(value) ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <FileText
              className="h-7 w-7 shrink-0 text-primary"
              strokeWidth={2.25}
            />
            <a
              href={proxyFileUrl(value, 'document.pdf')}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-sm text-foreground underline-offset-2 hover:text-neon hover:underline"
            >
              View PDF
            </a>
            <button
              type="button"
              onClick={remove}
              aria-label="Remove file"
              className="glass-thin shrink-0 rounded-lg p-2 text-destructive shadow-sm transition-colors hover:border-destructive/40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="group relative h-44 w-full overflow-hidden rounded-xl border border-border bg-card">
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={remove}
              aria-label="Remove image"
              className={cn(
                'glass-thin absolute right-2 top-2 rounded-lg p-2 text-destructive shadow-sm transition-opacity',
                'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      ) : (
        <label className="flex h-44 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-3 text-center text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/60 hover:text-primary">
          {busy ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : (
            <>
              <UploadCloud className="h-7 w-7" strokeWidth={2.25} />
              <span className="text-center text-xs leading-tight">
                Click to upload image or PDF
                <br />
                (optional, max 10MB)
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            disabled={busy}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      )}
      {publicId && (
        <p className="mt-1 truncate font-mono text-2xs text-muted-foreground/70">
          {publicId}
        </p>
      )}
    </div>
  );
}
