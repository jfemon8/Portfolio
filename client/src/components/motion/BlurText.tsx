import { useEffect, useMemo, useRef, useState } from 'react';
import {
  motion,
  type Easing,
  type Transition,
  useReducedMotion,
} from 'motion/react';

interface BlurTextProps {
  text?: string;
  /** Per-segment cascade delay in ms. */
  delay?: number;
  className?: string;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  /** IntersectionObserver threshold (0–1) for trigger. */
  threshold?: number;
  rootMargin?: string;
  animationFrom?: Record<string, string | number>;
  animationTo?: Array<Record<string, string | number>>;
  easing?: Easing | Easing[];
  onAnimationComplete?: () => void;
  /** Duration of each keyframe step, in seconds. */
  stepDuration?: number;
  /** Tag to render — defaults to `<p>`. Use `<span>` for inline. */
  as?: 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'div';
}

const buildKeyframes = (
  from: Record<string, string | number>,
  steps: Array<Record<string, string | number>>
): Record<string, Array<string | number>> => {
  const keys = new Set<string>([
    ...Object.keys(from),
    ...steps.flatMap((s) => Object.keys(s)),
  ]);
  const keyframes: Record<string, Array<string | number>> = {};
  keys.forEach((k) => {
    keyframes[k] = [
      from[k] as string | number,
      ...steps.map((s) => s[k] as string | number),
    ];
  });
  return keyframes;
};

/**
 * Per-word / per-letter blur-in text animation (ported from RDSWA's
 * reactbits collection). Triggers when scrolled into view; reduced-motion
 * users see the final state instantly. Useful for hero greetings and
 * section headings where the existing `Reveal` block fade feels too plain.
 */
export default function BlurText({
  text = '',
  delay = 200,
  className = '',
  animateBy = 'words',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
  animationFrom,
  animationTo,
  easing = (t: number) => t,
  onAnimationComplete,
  stepDuration = 0.35,
  as: Tag = 'p',
}: BlurTextProps) {
  const reduce = useReducedMotion();
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          if (ref.current) observer.unobserve(ref.current);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const defaultFrom = useMemo(
    () =>
      direction === 'top'
        ? { filter: 'blur(10px)', opacity: 0, y: -20 }
        : { filter: 'blur(10px)', opacity: 0, y: 20 },
    [direction]
  );
  const defaultTo = useMemo(
    () => [
      { filter: 'blur(5px)', opacity: 0.5, y: direction === 'top' ? 3 : -3 },
      { filter: 'blur(0px)', opacity: 1, y: 0 },
    ],
    [direction]
  );

  const fromSnapshot = animationFrom ?? defaultFrom;
  const toSnapshots = animationTo ?? defaultTo;
  const stepCount = toSnapshots.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = Array.from({ length: stepCount }, (_, i) =>
    stepCount === 1 ? 0 : i / (stepCount - 1)
  );

  // Reduced-motion: render final state immediately, no per-segment animation.
  if (reduce) {
    const MotionTag = motion[Tag] as typeof motion.p;
    return <MotionTag className={className}>{text}</MotionTag>;
  }

  const MotionTag = motion[Tag] as typeof motion.p;
  return (
    <MotionTag
      ref={ref as React.RefObject<HTMLParagraphElement>}
      className={`${className} flex flex-wrap overflow-visible`}
    >
      {elements.map((segment, index) => {
        const animateKeyframes = buildKeyframes(fromSnapshot, toSnapshots);
        const spanTransition: Transition = {
          duration: totalDuration,
          times,
          delay: (index * delay) / 1000,
          ease: easing,
        };
        return (
          <motion.span
            key={index}
            initial={fromSnapshot}
            animate={inView ? animateKeyframes : fromSnapshot}
            transition={spanTransition}
            onAnimationComplete={
              index === elements.length - 1 ? onAnimationComplete : undefined
            }
            style={{
              display: 'inline-block',
              willChange: 'transform, filter, opacity',
              paddingBottom: '0.15em',
            }}
          >
            {segment === ' ' ? ' ' : segment}
            {animateBy === 'words' && index < elements.length - 1 && ' '}
          </motion.span>
        );
      })}
    </MotionTag>
  );
}
