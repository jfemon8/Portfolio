import { useState } from 'react';
import { UploadCloud, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { ApiError } from '@/types';

interface UploadValue {
  url: string;
  publicId: string;
}

export type ImageUploadVariant = 'default' | 'avatar' | 'compact';

interface ImageUploadProps {
  value?: string;
  publicId?: string;
  onChange: (v: UploadValue) => void;
  label?: string;
  folder?: string;
  /** `default` = full-width landscape (covers/og); `avatar` = circular 144 px
   *  (profile photo); `compact` = full-width slim 96 px (social icons). */
  variant?: ImageUploadVariant;
}

/**
 * Uploads an image to Cloudinary via the backend and reports back
 * { url, publicId } through onChange. Theme-aware (light + dark) and
 * variant-aware (default landscape / circular avatar / compact slim).
 */
export default function ImageUpload({
  value,
  publicId,
  onChange,
  label = 'Image',
  folder,
  variant = 'default',
}: ImageUploadProps) {
  const [busy, setBusy] = useState(false);

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
      onChange({ url: data.url, publicId: data.publicId });
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(
        (err as ApiError).message || 'Upload failed (is Cloudinary configured?)'
      );
    } finally {
      setBusy(false);
    }
  };

  // Variant geometry. Centered for avatar/compact-when-square.
  const variantClass =
    variant === 'avatar'
      ? 'mx-auto h-36 w-36 rounded-full'
      : variant === 'compact'
        ? 'h-24 w-full rounded-xl'
        : 'h-44 w-full rounded-xl';

  // Cover for landscape/portrait crops, contain for icons (preserve aspect).
  const imgFit = variant === 'compact' ? 'object-contain p-2' : 'object-cover';

  return (
    <div>
      <label className="label">{label}</label>
      {value ? (
        <div
          className={cn(
            'group relative overflow-hidden border border-border bg-card',
            variantClass
          )}
        >
          <img src={value} alt="" className={cn('h-full w-full', imgFit)} />
          <button
            type="button"
            onClick={() => onChange({ url: '', publicId: '' })}
            aria-label="Remove image"
            className={cn(
              'absolute right-2 top-2 rounded-lg border border-border bg-background/85 p-2 text-destructive shadow-sm backdrop-blur transition-opacity',
              'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border bg-muted/40 px-3 text-center text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/60 hover:text-primary',
            variantClass
          )}
        >
          {busy ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : (
            <>
              <UploadCloud
                className={cn(variant === 'compact' ? 'h-5 w-5' : 'h-7 w-7')}
              />
              {variant !== 'compact' && (
                <span className="text-center text-xs leading-tight">
                  Click to upload
                  <br />
                  (max 5MB)
                </span>
              )}
              {variant === 'compact' && (
                <span className="text-center text-[11px]">
                  Upload icon (optional)
                </span>
              )}
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
      )}
      {publicId && (
        <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground/70">
          {publicId}
        </p>
      )}
    </div>
  );
}
