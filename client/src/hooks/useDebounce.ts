import { useEffect, useState } from 'react';

/**
 * Debounce a rapidly-changing value (project rule #3/#5). Reusable — used
 * for live search so keystrokes don't fire a request each time.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
