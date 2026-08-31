import { useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Trash2, Copy } from 'lucide-react';
import { api } from '@/lib/api';
import PageHeader from '@/components/admin/PageHeader';
import { useConfirm } from '@/components/admin/ConfirmModal';
import GlassCard from '@/components/shared/GlassCard';
import SmartImage from '@/components/shared/SmartImage';
import { Button } from '@/components/ui/button';
import { Spinner, ErrorState, EmptyState } from '@/components/ui/States';
import type { ApiError, MediaListResponse } from '@/types';

const FOLDERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'portfolio/projects', label: 'Projects' },
  { value: 'portfolio/profile', label: 'Profile' },
  { value: 'portfolio/blog', label: 'Blog' },
  { value: 'portfolio/seo', label: 'SEO' },
  { value: 'portfolio/hero', label: 'Hero' },
];

const fileSize = (b: number): string =>
  b < 1024 * 1024
    ? `${Math.round(b / 1024)} KB`
    : `${(b / 1048576).toFixed(1)} MB`;

// Cursor-paginated, mirroring AuditLogViewer's pagination pattern.
export default function MediaLibrary() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [folder, setFolder] = useState('');
  const [stack, setStack] = useState<(string | undefined)[]>([undefined]);
  const [pi, setPi] = useState(0);
  const cursor = stack[pi];

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['media', folder, pi],
    queryFn: async () =>
      (
        await api.get<MediaListResponse>(
          `/upload/assets?folder=${encodeURIComponent(folder)}${
            cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''
          }`
        )
      ).data,
    placeholderData: keepPreviousData,
  });

  const assets = data?.data ?? [];
  const next = data?.nextCursor ?? null;

  const del = useMutation({
    mutationFn: (publicId: string) =>
      api.delete('/upload/asset', { data: { publicId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media'] });
      toast.success('Asset deleted');
    },
    onError: (e) => toast.error((e as ApiError).message || 'Delete failed'),
  });

  const changeFolder = (f: string): void => {
    setFolder(f);
    setStack([undefined]);
    setPi(0);
  };
  const goNext = (): void => {
    if (!next) return;
    setStack((s) => {
      const c = [...s];
      c[pi + 1] = next;
      return c;
    });
    setPi((p) => p + 1);
  };
  const copyUrl = async (url: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div>
      <PageHeader
        title="Media library"
        action={
          <select
            value={folder}
            onChange={(e) => changeFolder(e.target.value)}
            className="input w-auto"
          >
            {FOLDERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        }
      />

      {isLoading && <Spinner />}
      {isError && <ErrorState onRetry={() => void refetch()} />}
      {!isLoading && !isError && assets.length === 0 && (
        <EmptyState message="No assets in this folder." />
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {assets.map((a) => (
          <GlassCard key={a.publicId} className="overflow-hidden">
            <div className="aspect-video border-b border-border/60 bg-background/40">
              <SmartImage
                src={a.url}
                alt={a.publicId}
                imgWidth={400}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="space-y-2 p-2">
              <p
                className="truncate font-mono text-2xs text-muted-foreground"
                title={a.publicId}
              >
                {a.publicId}
              </p>
              <p className="text-2xs text-muted-foreground/60">
                {a.format?.toUpperCase()} · {a.width}×{a.height} ·{' '}
                {fileSize(a.bytes)}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => void copyUrl(a.url)}
                  title="Copy URL"
                  className="flex-1 rounded-lg border border-border/70 p-2 text-muted-foreground transition-colors hover:border-primary/40 hover:text-neon"
                >
                  <Copy className="mx-auto h-4 w-4" />
                </button>
                <button
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Delete asset?',
                      message: `"${a.publicId}" will be permanently removed from Cloudinary. This cannot be undone.`,
                      confirmLabel: 'Delete',
                      variant: 'danger',
                    });
                    if (ok) del.mutate(a.publicId);
                  }}
                  title="Delete"
                  className="flex-1 rounded-lg border border-border/70 p-2 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                >
                  <Trash2 className="mx-auto h-4 w-4" />
                </button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {(pi > 0 || next) && (
        <div className="mt-4 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={pi === 0 || isFetching}
            onClick={() => setPi((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <span className="text-sm text-muted-foreground">Page {pi + 1}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!next || isFetching}
            onClick={goNext}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
