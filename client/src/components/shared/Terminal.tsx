import { motion, useReducedMotion } from 'motion/react';
import GlassCard from '@/components/shared/GlassCard';
import { ease } from '@/config/animation';
import { useSkipEntranceIfVisible } from '@/hooks/useSkipEntranceIfVisible';
import { cn } from '@/lib/cn';

interface TerminalProps {
  /** lines beginning with "$ " render as commands (neon prompt) */
  lines: string[];
  title?: string;
  className?: string;
}

export default function Terminal({
  lines,
  title = 'emon@portfolio: ~',
  className,
}: TerminalProps) {
  const reduce = useReducedMotion();
  const { ref, skip: alreadyVisible } =
    useSkipEntranceIfVisible<HTMLPreElement>();
  const skip = reduce || alreadyVisible;

  return (
    <GlassCard className={cn('overflow-hidden', className)}>
      <div className="flex items-center gap-2 border-b border-border/70 bg-background/40 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
        <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
        <span className="ml-2 font-mono text-xs text-muted-foreground">
          {title}
        </span>
      </div>
      <pre
        ref={ref}
        className="whitespace-pre-wrap break-words p-5 font-mono text-2xs leading-relaxed text-muted-foreground sm:text-[0.8125rem]"
      >
        <code>
          {lines.map((ln, i) => {
            const isCmd = ln.startsWith('$ ');
            const last = i === lines.length - 1;
            return (
              <motion.span
                key={i}
                className="block"
                initial={skip ? false : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.25,
                  delay: skip ? 0 : i * 0.35,
                  ease: ease.out,
                }}
              >
                {isCmd ? (
                  <>
                    <span className="text-neon">$</span>
                    {ln.slice(1)}
                  </>
                ) : (
                  <span className="text-foreground">{ln}</span>
                )}
                {last && !reduce && (
                  <span className="ml-1 inline-block h-3.5 w-1.5 translate-y-0.5 animate-blink bg-neon align-baseline" />
                )}
              </motion.span>
            );
          })}
        </code>
      </pre>
    </GlassCard>
  );
}
