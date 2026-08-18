import { useEffect, useState, type ReactNode } from 'react';
import { ErrorState, EmptyState } from '@/components/ui/States';
import { getCount, rememberCount } from '@/stores/layoutHints';

// Structural minimum shared by useQuery and useInfiniteQuery, so both plug in without a wrapper.
export interface AsyncQuery<TData> {
  data: TData | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

/** Pending until every query resolves — only for a value genuinely derived from several, never to make independent slots wait on each other. */
export const allOf = (
  ...queries: AsyncQuery<unknown>[]
): AsyncQuery<true> => ({
  data: queries.every((q) => q.data !== undefined) ? true : undefined,
  isPending: queries.some((q) => q.isPending),
  isError: queries.some((q) => q.isError),
  refetch: () => Promise.all(queries.map((q) => q.refetch())),
});

interface AsyncProps<TData, TValue> {
  query: AsyncQuery<TData>;
  /** Narrows the response envelope to the value the children render. */
  select?: (data: TData) => TValue;
  children: (value: TValue) => ReactNode;
  /** Given the item count to draw; must occupy the same slot and shape the content will. */
  skeleton: ReactNode | ((count: number) => ReactNode);
  /** layoutHints key: remembers last render's item count so the skeleton count matches what replaces it. */
  hint?: string;
  fallbackCount?: number;
  empty?: ReactNode;
  errorMessage?: string;
  /** For sections that may not exist at all: renders nothing until a hint proves they do, rather than reserving space that then collapses. Implies `hideOnError`. */
  selfHiding?: boolean;
  /** Fails silently — for a secondary slot whose primary already reports the same failure. */
  hideOnError?: boolean;
  /** Applied to the error/empty state only, e.g. `col-span-full` inside a grid. */
  stateClass?: string;
}

/** Renders skeleton → content → error/empty in one slot, as a Fragment so placeholders sit beside any static cards in the same grid. */
export default function Async<TData, TValue = TData>({
  query,
  select,
  children,
  skeleton,
  hint,
  fallbackCount = 6,
  empty,
  errorMessage,
  selfHiding = false,
  hideOnError = false,
  stateClass,
}: AsyncProps<TData, TValue>) {
  // Pinned at mount: the skeleton count must not change while the skeleton is on screen.
  const [remembered] = useState(() => (hint ? getCount(hint) : undefined));

  const value =
    query.data === undefined
      ? undefined
      : select
        ? select(query.data)
        : (query.data as unknown as TValue);

  const size =
    value === undefined || value === null
      ? 0
      : Array.isArray(value)
        ? value.length
        : 1;

  useEffect(() => {
    if (hint && query.data !== undefined) rememberCount(hint, size);
  }, [hint, query.data, size]);

  const wrap = (node: ReactNode): ReactNode =>
    stateClass ? <div className={stateClass}>{node}</div> : node;

  // isPending, not isLoading: with placeholderData the query is fetching but already has content to show.
  if (query.isPending) {
    if (selfHiding && !remembered) return null;
    const count = remembered ?? fallbackCount;
    if (count === 0) return null;
    return <>{typeof skeleton === 'function' ? skeleton(count) : skeleton}</>;
  }

  if (query.isError && value === undefined) {
    if (selfHiding || hideOnError) return null;
    return (
      <>
        {wrap(
          <ErrorState
            message={errorMessage}
            onRetry={() => void query.refetch()}
          />
        )}
      </>
    );
  }

  if (size === 0) {
    if (selfHiding || empty === undefined) return null;
    return (
      <>
        {wrap(typeof empty === 'string' ? <EmptyState message={empty} /> : empty)}
      </>
    );
  }

  return <>{children(value as TValue)}</>;
}
