import { useEffect, useState, type FormEvent } from 'react';
import { UploadCloud, Link2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import type { ApiError } from '@/types';

interface RichTextImageModalProps {
  open: boolean;
  folder?: string;
  onClose: () => void;
  onSubmit: (url: string, alt: string) => void;
}

type Tab = 'upload' | 'url';

/** Custom replacement for window.prompt() when inserting an image in RichTextEditor — upload to Cloudinary or paste a URL. */
export default function RichTextImageModal({
  open,
  folder,
  onClose,
  onSubmit,
}: RichTextImageModalProps) {
  const [tab, setTab] = useState<Tab>('upload');
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab('upload');
    setUrl('');
    setAlt('');
    setBusy(false);
  }, [open]);

  const handleFile = async (file?: File): Promise<void> => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await api.post<{ url: string; publicId: string }>(
        `/upload/image${folder ? `?folder=${folder}` : ''}`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setUrl(data.url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(
        (err as ApiError).message || 'Upload failed (is Cloudinary configured?)'
      );
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmit(url.trim(), alt.trim());
  };

  return (
    <Modal open={open} title="Insert image" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="flex gap-1 rounded-lg border border-border/70 bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors',
              tab === 'upload'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <UploadCloud className="h-3.5 w-3.5" /> Upload
          </button>
          <button
            type="button"
            onClick={() => setTab('url')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors',
              tab === 'url'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Link2 className="h-3.5 w-3.5" /> From URL
          </button>
        </div>

        {tab === 'upload' ? (
          <label
            className={cn(
              'flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 text-center text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/60 hover:text-primary',
              busy && 'pointer-events-none opacity-70'
            )}
          >
            {busy ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              <>
                <UploadCloud className="h-7 w-7" strokeWidth={2.25} />
                <span className="text-xs leading-tight">
                  Click to upload (max 5MB)
                </span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        ) : (
          <div>
            <label className="label">Image URL</label>
            <input
              autoFocus
              className="input"
              placeholder="https://example.com/photo.jpg"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        )}

        {url && (
          <div className="overflow-hidden rounded-xl border border-border/70">
            <img src={url} alt="" className="h-40 w-full object-cover" />
          </div>
        )}

        <div>
          <label className="label">Alt text (optional)</label>
          <input
            className="input"
            placeholder="Describe the image for accessibility"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!url.trim() || busy}>
            Insert image
          </Button>
        </div>
      </form>
    </Modal>
  );
}
