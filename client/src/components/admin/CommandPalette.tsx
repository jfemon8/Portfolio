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

/** The single quick-nav surface for the admin (⌘K / Ctrl+K, Raycast-style). */
export default function CommandPalette({ items }: { items: CommandItem[] }) {
  const open = useUIStore((s) => s.commandOpen);
  const setOpen = useUIStore((s) => s.setCommandOpen);
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [q, setQ] = useState('');
  // `active` starts at -1 so nothing looks auto-selected the moment the palette opens.
  const [active, setActive] = useState(-1);
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
    if (!open) return;
    setQ('');
    setActive(-1);
    const timer = setTimeout(() => inputRef.current?.focus(), 40);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, [open]);

  // Once the user types, promote the first match to active so Enter selects it; clearing the field falls back to no selection.
  useEffect(() => {
    setActive(q.trim() ? 0 : -1);
  }, [q]);

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
          className="w-full max-w-xl overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-[inset_0_0.0625rem_0_var(--glass-highlight),0_1.25rem_3rem_-0.75rem_var(--glass-shadow)] backdrop-blur-[1.875rem] backdrop-saturate-150 backdrop-brightness-105"
        >
          {/* backdrop-filter creates a stacking context that leaks the global focus ring above the modal, so we suppress it and use `focus-within:border-primary` instead. */}
          <div className="flex items-center gap-3 border-b border-border/60 px-4 transition-colors focus-within:border-primary">
            <Search className="h-4 w-4 text-muted-foreground/70" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Jump to…"
              className="w-full bg-transparent py-4 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <kbd className="rounded border border-border/60 px-1.5 py-0.5 font-mono text-3xs text-muted-foreground/70">
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
                    <span className="text-2xs uppercase tracking-wide text-muted-foreground/50">
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
