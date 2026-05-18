import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Search, CornerDownLeft } from 'lucide-react';
import { useUIStore } from '@/stores/ui';
import { cn } from '@/lib/cn';

export interface CommandItem {
  label: string;
  to: string;
  group: string;
}

/**
 * ⌘K / Ctrl+K command palette (Raycast-style) — the single quick-nav surface
 * for the admin (project rule #3). Glass, keyboard-driven, reduced-motion safe.
 */
export default function CommandPalette({ items }: { items: CommandItem[] }) {
  const open = useUIStore((s) => s.commandOpen);
  const setOpen = useUIStore((s) => s.setCommandOpen);
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term
      ? items.filter(
          (i) =>
            i.label.toLowerCase().includes(term) ||
            i.group.toLowerCase().includes(term)
        )
      : items;
  }, [q, items]);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 40);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => setActive(0), [q]);

  if (!open) return null;

  const go = (to: string): void => {
    setOpen(false);
    navigate(to);
  };

  const onKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = results[active];
      if (sel) go(sel.to);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setOpen(false)}
      >
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={onKey}
          className="w-full max-w-xl overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-glow backdrop-blur-2xl"
        >
          <div className="flex items-center gap-3 border-b border-border/60 px-4">
            <Search className="h-4 w-4 text-muted-foreground/70" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Jump to…"
              className="w-full bg-transparent py-4 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
            <kbd className="rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/70">
              ESC
            </kbd>
          </div>
          <ul className="max-h-[50vh] overflow-y-auto p-2">
            {results.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground/70">
                No matches
              </li>
            )}
            {results.map((item, i) => (
              <li key={item.to}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item.to)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                    i === active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-card'
                  )}
                >
                  <span>
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground/50">
                      {item.group}
                    </span>
                    <span className="ml-2 text-foreground">{item.label}</span>
                  </span>
                  {i === active && (
                    <CornerDownLeft className="h-3.5 w-3.5 opacity-70" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
