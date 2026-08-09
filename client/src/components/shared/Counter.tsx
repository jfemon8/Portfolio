import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';

interface CounterProps {
  /** e.g. "1000+", "100+", "3★", "Pupil" — leading number animates, rest stays */
  value: string;
  className?: string;
  duration?: number;
}

export default function Counter({
  value,
  className,
  duration = 1.4,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const [alreadyVisible, setAlreadyVisible] = useState(false);

  useLayoutEffect(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect && rect.top < window.innerHeight && rect.bottom > 0) {
      setAlreadyVisible(true);
    }
  }, []);

  const match = value.match(/^(\d[\d,]*)(.*)$/);
  const target = match ? Number(match[1]!.replace(/,/g, '')) : null;
  const suffix = match ? match[2]! : '';

  const [display, setDisplay] = useState<string>(target === null ? value : '0');

  useEffect(() => {
    if (target === null || !inView) return;
    if (reduce || alreadyVisible) {
      setDisplay(String(target));
      return;
    }
    const controls = animate(0, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(String(Math.round(v))),
    });
    return () => controls.stop();
  }, [inView, target, reduce, alreadyVisible, duration]);

  return (
    <span ref={ref} className={className}>
      {display}
      {target !== null ? suffix : ''}
    </span>
  );
}
