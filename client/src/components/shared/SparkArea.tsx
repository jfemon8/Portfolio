import { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useSkipEntranceIfVisible } from '@/hooks/useSkipEntranceIfVisible';
import { cn } from '@/lib/cn';

interface SparkAreaProps {
  /** numeric series (chronological) */
  data: number[];
  className?: string;
  ariaLabel?: string;
}

/** Hand-rolled SVG chart, no library, to keep the public bundle lean — recharts stays admin-only/lazy. */
export default function SparkArea({
  data,
  className,
  ariaLabel,
}: SparkAreaProps) {
  const reduce = useReducedMotion();
  const { ref, skip: alreadyVisible } =
    useSkipEntranceIfVisible<SVGSVGElement>();
  const skip = reduce || alreadyVisible;
  const gid = useId();
  if (data.length < 2) return null;

  const W = 100;
  const H = 32;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const xy = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / span) * H;
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  });
  const line = xy.map((p, i) => `${i ? 'L' : 'M'}${p}`).join(' ');
  const area = `${line} L${W} ${H} L0 ${H} Z`;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
      className={cn('h-full w-full text-primary', className)}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <motion.path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={skip ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}
