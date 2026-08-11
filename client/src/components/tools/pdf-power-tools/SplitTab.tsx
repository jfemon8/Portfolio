import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  renderPageThumbnails,
  extractPages,
  splitIntoSinglePages,
  zipFiles,
  downloadBytes,
  formatPageRanges,
  parsePageRanges,
} from '@/lib/pdfTools';
import Dropzone from './Dropzone';
import PageThumbGrid from './PageThumbGrid';

export default function SplitTab() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rangeText, setRangeText] = useState('');
  const [busy, setBusy] = useState<'extract' | 'splitAll' | null>(null);

  const loadFile = async (files: File[]) => {
    const picked = files[0];
    if (!picked) return;
    setFile(picked);
    setThumbnails([]);
    setSelected(new Set());
    setRangeText('');
    setLoading(true);
    try {
      const thumbs = await renderPageThumbnails(picked);
      setThumbnails(thumbs);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not read this PDF.'
      );
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      setRangeText(formatPageRanges([...next]));
      return next;
    });
  };

  const onRangeTextChange = (value: string) => {
    setRangeText(value);
    if (!value.trim()) {
      setSelected(new Set());
      return;
    }
    try {
      const indices = parsePageRanges(value, thumbnails.length);
      setSelected(new Set(indices));
    } catch {
      // Leave the selection as-is while the user is still mid-typing an invalid range.
    }
  };

  const handleExtract = async () => {
    if (!file || selected.size === 0) return;
    setBusy('extract');
    try {
      const bytes = await extractPages(
        file,
        [...selected].sort((a, b) => a - b)
      );
      downloadBytes(bytes, `${baseName(file.name)}-selected.pdf`);
      toast.success(
        `Extracted ${selected.size} page${selected.size === 1 ? '' : 's'}`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not extract pages.'
      );
    } finally {
      setBusy(null);
    }
  };

  const handleSplitAll = async () => {
    if (!file) return;
    setBusy('splitAll');
    try {
      const pages = await splitIntoSinglePages(file);
      const zipped = await zipFiles(
        pages.map((data, i) => ({
          name: `${baseName(file.name)}-page-${i + 1}.pdf`,
          data,
        }))
      );
      downloadBytes(
        zipped,
        `${baseName(file.name)}-pages.zip`,
        'application/zip'
      );
      toast.success(`Split into ${pages.length} PDFs`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not split this PDF.'
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <Dropzone
        onFiles={loadFile}
        label={file ? file.name : 'Drop a PDF here, or click to choose a file'}
        hint={
          !file ? 'Pick pages to extract, or split every page apart' : undefined
        }
      />

      {loading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Rendering pages…
        </p>
      )}

      {thumbnails.length > 0 && (
        <>
          <PageThumbGrid
            thumbnails={thumbnails}
            isSelected={(i) => selected.has(i)}
            onClick={toggle}
          />

          <div>
            <label className="label" htmlFor="split-ranges">
              Selected pages
            </label>
            <input
              id="split-ranges"
              className="input mt-1.5"
              value={rangeText}
              onChange={(e) => onRangeTextChange(e.target.value)}
              placeholder="e.g. 1-3, 5, 8-10"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleExtract}
              disabled={selected.size === 0 || busy !== null}
            >
              {busy === 'extract'
                ? 'Extracting…'
                : `Extract Selected (${selected.size})`}
            </Button>
            <Button
              variant="secondary"
              onClick={handleSplitAll}
              disabled={busy !== null}
            >
              {busy === 'splitAll'
                ? 'Splitting…'
                : `Split Into ${thumbnails.length} Individual PDFs`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function baseName(filename: string): string {
  return filename.replace(/\.pdf$/i, '');
}
