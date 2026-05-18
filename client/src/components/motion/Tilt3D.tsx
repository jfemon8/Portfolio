import { useRef, type ReactNode } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
  useReducedMotion,
} from 'motion/react';
import { spring } from '@/config/animation';

interface Tilt3DProps {
  children: ReactNode;
  /** max rotation in degrees */
  max?: number;
  className?: string;
  glare?: boolean;
}

/**
 * 3D pointer-tilt card with optional glare — the premium interactive card
 * primitive (project rule #3). GPU-only transforms; reduced-motion safe;
 * self-contained (no external `.group` dependency).
 */
export default function Tilt3D({
  children,
  max = 12,
  className,
  glare = true,
}: Tilt3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const glareOpacity = useSpring(0, spring.soft);

  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring.soft);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring.soft);
  const gx = useTransform(px, [0, 1], [0, 100]);
  const gy = useTransform(py, [0, 1], [0, 100]);
  const glareBg = useMotionTemplate`radial-gradient(600px circle at ${gx}% ${gy}%, hsl(var(--primary) / 0.15), transparent 40%)`;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const onEnter = () => !reduce && glareOpacity.set(1);
  const reset = () => {
    px.set(0.5);
    py.set(0.5);
    glareOpacity.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
    >
      {children}
      {glare && !reduce && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ background: glareBg, opacity: glareOpacity }}
        />
      )}
    </motion.div>
  );
}
