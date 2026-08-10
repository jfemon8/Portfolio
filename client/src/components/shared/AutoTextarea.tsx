import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

// Grows/shrinks to fit content via scrollHeight instead of a fixed `rows` — pass a min-h-* class for the floor; CSS min-height clamps the computed height even when scrollHeight would be smaller, so no JS-side floor logic is needed.
export default function AutoTextarea({
  className,
  value,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      className={cn('resize-none overflow-hidden', className)}
      value={value}
      {...rest}
    />
  );
}
