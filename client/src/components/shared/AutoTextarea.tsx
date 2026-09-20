import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

// Grows and shrinks to fit content via scrollHeight instead of a fixed `rows`, so a min-h-* class is all the floor it needs.
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
