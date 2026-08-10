import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

const RELOAD_FLAG = 'portfolio_chunk_reload';

const isChunkLoadError = (error: unknown): boolean =>
  /dynamically imported module|failed to fetch|loading chunk|importing a module script failed/i.test(
    error instanceof Error ? error.message : String(error)
  );

// A stale tab after a redeploy gets one silent auto-reload per tab session (flag is never cleared programmatically — clearing it on mount raced the async chunk failure and caused a reload loop); any other render error falls back to this hook-free screen instead of a blank page.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (isChunkLoadError(error) && !sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1');
      window.location.reload();
      return;
    }
    if (import.meta.env.DEV)
      console.error('Uncaught render error:', error, info);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle
            className="h-10 w-10 text-destructive"
            strokeWidth={2.25}
          />
          <div>
            <p className="text-lg font-semibold text-foreground">
              Something went wrong.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Please reload the page.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/50"
          >
            <RefreshCw className="h-4 w-4" /> Reload
          </button>
        </div>
      </div>
    );
  }
}
