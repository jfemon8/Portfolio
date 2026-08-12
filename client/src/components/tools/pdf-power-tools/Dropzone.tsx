import { useRef } from 'react';
import toast from 'react-hot-toast';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DropzoneProps {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  label: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export default function Dropzone({
  onFiles,
  multiple,
  label,
  hint,
  disabled,
  className,
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (list: FileList | null) => {
    if (!list || !list.length) return;
    const files = Array.from(list).filter(
      (f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
    );
    // Dropping a non-PDF used to do nothing at all, which reads as the tool being broken.
    if (files.length < list.length) {
      const skipped = list.length - files.length;
      toast.error(
        `Skipped ${skipped} file${skipped === 1 ? '' : 's'} — only PDFs can be used here.`
      );
    }
    if (files.length) onFiles(files);
  };

  return (
    <div
      onDrop={(e) => {
        e.preventDefault();
        if (disabled) return;
        handleFiles(e.dataTransfer.files);
      }}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/70 p-8 text-center transition-colors hover:border-primary/40',
        disabled && 'pointer-events-none opacity-60',
        className
      )}
    >
      <Upload className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm text-foreground">{label}</p>
      {hint && <p className="text-2xs text-muted-foreground/70">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
