import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Download,
  ExternalLink,
  FileText,
  Link2,
  Share2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useProfile } from '@/hooks/usePortfolio';
import { proxyFileUrl } from '@/lib/fileProxy';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { PageSkeleton } from '@/components/ui/Skeletons';
import { Button } from '@/components/ui/button';

const PdfViewer = lazy(() => import('./PdfViewer'));

type DocumentKind = 'cv' | 'resume';

const isPdf = (mimeType: string, fileName: string): boolean =>
  mimeType === 'application/pdf' || /\.pdf$/i.test(fileName);

export default function PublicDocumentViewer({ kind }: { kind: DocumentKind }) {
  const { data, isLoading, isError, refetch } = useProfile();
  const [copied, setCopied] = useState(false);
  const profile = data?.data;
  const isCv = kind === 'cv';
  const title = isCv ? 'CV' : 'Resume';
  const fileName = isCv ? 'CV.pdf' : 'Resume.pdf';
  const sourceFileName = isCv ? profile?.cvFileName || fileName : fileName;
  const downloadName = isCv ? 'CV_Emon.pdf' : 'Resume_Emon.pdf';
  const fileUrl = isCv ? profile?.cvUrl || '' : profile?.resumeUrl || '';
  const mimeType = isCv ? profile?.cvMimeType || '' : 'application/pdf';
  const pdf = isPdf(mimeType, sourceFileName);
  const downloadUrl = useMemo(
    () => proxyFileUrl(fileUrl, downloadName, false),
    [downloadName, fileUrl]
  );
  const inlineUrl = useMemo(
    () => proxyFileUrl(fileUrl, fileName, true),
    [fileName, fileUrl]
  );
  const officeViewerUrl = useMemo(
    () =>
      `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
        new URL(inlineUrl, window.location.origin).toString()
      )}`,
    [inlineUrl]
  );

  useEffect(() => {
    const previousTitle = document.title;
    document.title = fileName;
    return () => {
      document.title = previousTitle;
    };
  }, [fileName]);

  const copyLink = async (): Promise<void> => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success(`${title} link copied`);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const share = async (): Promise<void> => {
    if (navigator.share) {
      await navigator.share({
        title: `${profile?.name || 'My'} ${title}`,
        url: window.location.href,
      });
      return;
    }
    await copyLink();
  };

  if (isLoading) return <PageSkeleton />;
  if (isError)
    return (
      <ErrorState
        message={`Could not load the ${title.toLowerCase()}.`}
        onRetry={() => void refetch()}
      />
    );
  if (!fileUrl) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4 py-20">
        <div className="text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="text-2xl font-semibold text-foreground">
            {title} not available
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This document has not been uploaded yet.
          </p>
        </div>
      </main>
    );
  }

  if (pdf) {
    return (
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-3 py-6 sm:px-6 lg:px-8">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <FileText className="h-5 w-5 shrink-0 text-red-500" />
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
                {fileName}
              </h1>
              <p className="text-xs text-muted-foreground">
                {profile?.name || title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void copyLink()}
              title="Copy link"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {copied ? 'Copied' : 'Copy link'}
              </span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void share()}
              title={`Share ${title}`}
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <a
              href={downloadUrl}
              download={downloadName}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              title={`Download ${title}`}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </a>
          </div>
        </header>
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center p-6">
              <Skeleton className="h-full w-full rounded-xl" />
            </div>
          }
        >
          <PdfViewer
            url={fileUrl}
            fileName={downloadName}
            displayName={fileName}
            showDocumentName={false}
            showDownload={false}
            className="min-h-0 flex-1"
          />
        </Suspense>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-3 py-6 sm:px-6 lg:px-8">
      <section className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex h-[calc(100vh-3rem)] min-h-[36rem] flex-col">
          <iframe
            title={fileName}
            src={officeViewerUrl}
            className="min-h-0 flex-1 border-0"
          />
          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <span>Document preview is provided by Google Docs Viewer.</span>
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              Open download <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
