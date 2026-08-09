import { useLayoutEffect, useRef, useState } from 'react';

/** True if the ref'd element was already in the viewport at mount (skip its entrance animation). */
export function useSkipEntranceIfVisible<T extends Element>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect && rect.top < window.innerHeight && rect.bottom > 0) {
      setVisible(true);
    }
  }, []);

  return { ref, skip: visible };
}
