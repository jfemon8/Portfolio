import { useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronUp, ChevronDown, X, FileStack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import {
  renderFirstPageInfo,
  mergePdfs,
  downloadBytes,
  formatBytes,
} from '@/lib/pdfTools';
import Dropzone from './Dropzone';

interface MergeItem {
  id: string;
  file: File;
  thumbnail: string | null;
  pageCount: number | null;
}

let idSeq = 0;
const nextId = () => `merge-${++idSeq}`;

export default function MergeTab() {
  const [items, setItems] = useState<MergeItem[]>([]);
  const [merging, setMerging] = useState(false);

  const addFiles = (files: File[]) => {
    const newItems = files.map((file) => ({
      id: nextId(),
      file,
      thumbnail: null,
      pageCount: null,
    }));
    setItems((prev) => [...prev, ...newItems]);
    for (const item of newItems) {
      renderFirstPageInfo(item.file)
        .then(({ thumbnail, pageCount }) => {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, thumbnail, pageCount } : i
            )
          );
        })
        .catch(() => {
          setItems((prev) => prev.filter((i) => i.id !== item.id));
          toast.error(`Couldn't read "${item.file.name}" — skipped.`);
        });
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      const a = next[index];
      const b = next[target];
      if (!a || !b) return prev;
      next[index] = b;
      next[target] = a;
      return next;
    });
  };

  const remove = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleMerge = async () => {
    setMerging(true);
    try {
      const bytes = await mergePdfs(items.map((i) => i.file));
      downloadBytes(bytes, 'merged.pdf');
      toast.success(
        `Merged ${items.length} PDFs — ${formatBytes(bytes.length)}`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not merge these PDFs.'
      );
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="space-y-5">
      <Dropzone
        onFiles={addFiles}
        multiple
        label="Drop two or more PDFs here, or click to choose files"
        hint="They'll be merged in the order shown below"
      />

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-border/70 bg-card/50 px-3 py-2"
            >
              <span className="flex flex-col">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="rounded p-1 text-muted-foreground/70 transition-colors hover:text-neon disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                  className="rounded p-1 text-muted-foreground/70 transition-colors hover:text-neon disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </span>

              <div
                className={cn(
                  'flex h-14 w-11 shrink-0 items-center justify-center overflow-hidden rounded border border-border/60 bg-bg-elevated/50'
                )}
              >
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt="" className="w-full" />
                ) : (
                  <FileStack className="h-4 w-4 animate-pulse text-muted-foreground/50" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">
                  {item.file.name}
                </p>
                <p className="text-2xs text-muted-foreground/70">
                  {item.pageCount != null
                    ? `${item.pageCount} page${item.pageCount === 1 ? '' : 's'} · `
                    : ''}
                  {formatBytes(item.file.size)}
                </p>
              </div>

              <button
                type="button"
                aria-label="Remove"
                onClick={() => remove(item.id)}
                className="rounded p-1.5 text-muted-foreground/70 transition-colors hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button
        onClick={handleMerge}
        disabled={items.length < 2 || merging}
        className="w-full sm:w-auto"
      >
        {merging
          ? 'Merging…'
          : `Merge ${items.length || ''} PDF${items.length === 1 ? '' : 's'}`}
      </Button>
      {items.length === 1 && (
        <p className="text-2xs text-muted-foreground/70">
          Add at least one more PDF to merge.
        </p>
      )}
    </div>
  );
}
