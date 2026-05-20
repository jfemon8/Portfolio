import { useState } from 'react';
import { UploadCloud, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { ApiError } from '@/types';

interface UploadValue {
  url: string;
  publicId: string;
}

interface ImageUploadProps {
  value?: string;
  publicId?: string;
  onChange: (v: UploadValue) => void;
  label?: string;
  folder?: string;
}

/**
 * Uploads an image to Cloudinary via the backend and reports back
 * { url, publicId } through onChange.
 */
export default function ImageUpload({
  value,
  publicId,
  onChange,
  label = 'Image',
  folder,
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

  return (
    <div>
      <label className="label">{label}</label>
      {value ? (
        <div className="group relative w-full overflow-hidden rounded-xl border border-line">
          <img src={value} alt="" className="h-44 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange({ url: '', publicId: '' })}
            className="absolute right-2 top-2 rounded-lg bg-bg/80 p-2 text-neon-pink opacity-100 backdrop-blur transition sm:opacity-0 sm:group-hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-bg-soft text-ink-dim transition-colors hover:border-neon/40 hover:text-neon">
          {busy ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : (
            <>
              <UploadCloud className="h-7 w-7" />
              <span className="text-xs">Click to upload (max 5MB)</span>
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
        <p className="mt-1 truncate font-mono text-[11px] text-ink-dim">
          {publicId}
        </p>
      )}
    </div>
  );
}
