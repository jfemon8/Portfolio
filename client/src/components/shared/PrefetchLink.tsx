import { useRef } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { prefetchRoute } from '@/lib/prefetch';

/**
 * The single intent-prefetching link (project rule #3). A drop-in for
 * react-router's `Link` that warms the destination route's chunk on first
 * hover/focus, then behaves exactly like `Link`.
 */
export default function PrefetchLink({
  to,
  onPointerEnter,
  onFocus,
  ...rest
}: LinkProps) {
  const warmed = useRef(false);
  const warm = (): void => {
    if (warmed.current) return;
    warmed.current = true;
    if (typeof to === 'string') prefetchRoute(to);
  };

  return (
    <Link
      to={to}
      onPointerEnter={(e) => {
        warm();
        onPointerEnter?.(e);
      }}
      onFocus={(e) => {
        warm();
        onFocus?.(e);
      }}
      {...rest}
    />
  );
}
