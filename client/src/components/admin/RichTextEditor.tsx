import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Heading2,
  Code,
  Link2,
  List,
  Quote,
  Pencil,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface RichTextEditorProps {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}

type Tool = {
  icon: typeof Bold;
  title: string;
  command: string;
  value?: string;
  prompt?: string;
};

type ActiveState = {
  bold: boolean;
  italic: boolean;
  heading: boolean;
  code: boolean;
  quote: boolean;
  list: boolean;
};

const TOOLS: Tool[] = [
  { icon: Bold, title: 'Bold', command: 'bold' },
  { icon: Italic, title: 'Italic', command: 'italic' },
  { icon: Heading2, title: 'Heading', command: 'formatBlock', value: 'h2' },
  { icon: Code, title: 'Code block', command: 'formatBlock', value: 'pre' },
  { icon: Quote, title: 'Quote', command: 'formatBlock', value: 'blockquote' },
  { icon: List, title: 'Bullet list', command: 'insertUnorderedList' },
  { icon: Link2, title: 'Link', command: 'createLink', prompt: 'Paste a URL' },
  { icon: Trash2, title: 'Clear formatting', command: 'removeFormat' },
];

const initialActiveState: ActiveState = {
  bold: false,
  italic: false,
  heading: false,
  code: false,
  quote: false,
  list: false,
};

export default function RichTextEditor({
  value,
  onChange,
  rows = 12,
  placeholder = 'Write your content here...',
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<ActiveState>(initialActiveState);

  const minHeight = useMemo(
    () => `${Math.max(rows, 6) * 1.35 + 2.5}rem`,
    [rows]
  );

  useEffect(() => {
    const editable = ref.current;
    if (!editable) return;
    if (editable.innerHTML !== value) {
      editable.innerHTML = value;
    }
  }, [value]);

  useEffect(() => {
    const readActive = (): void => {
      const editable = ref.current;
      const selection = window.getSelection();
      if (
        !editable ||
        !selection ||
        selection.rangeCount === 0 ||
        !editable.contains(selection.anchorNode)
      ) {
        setActive(initialActiveState);
        return;
      }

      const anchorElement =
        (selection.anchorNode instanceof HTMLElement
          ? selection.anchorNode
          : selection.anchorNode?.parentElement) ?? null;
      const block = anchorElement?.closest('h2,pre,blockquote,li');

      setActive({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        heading: block?.tagName === 'H2',
        code: block?.tagName === 'PRE',
        quote: block?.tagName === 'BLOCKQUOTE',
        list: block?.tagName === 'LI',
      });
    };

    document.addEventListener('selectionchange', readActive);
    return () => document.removeEventListener('selectionchange', readActive);
  }, []);

  const sync = (): void => {
    const editable = ref.current;
    if (!editable) return;
    onChange(editable.innerHTML);
  };

  const apply = (tool: Tool): void => {
    const editable = ref.current;
    if (!editable) return;

    editable.focus();
    if (tool.prompt) {
      const url = window.prompt(tool.prompt, 'https://');
      if (!url) return;
      document.execCommand(tool.command, false, url);
    } else {
      document.execCommand(tool.command, false, tool.value);
    }

    window.requestAnimationFrame(sync);
  };

  const isActive = (title: string): boolean => {
    if (title === 'Bold') return active.bold;
    if (title === 'Italic') return active.italic;
    if (title === 'Heading') return active.heading;
    if (title === 'Code block') return active.code;
    if (title === 'Quote') return active.quote;
    if (title === 'Bullet list') return active.list;
    return false;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-1 border-b border-border/60 bg-muted/35 px-2.5 py-2">
        <div className="mr-2 hidden items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground sm:flex">
          <Pencil className="h-3 w-3" />
          Rich text editor
        </div>

        {TOOLS.map((t) => {
          const activeTool = isActive(t.title);
          return (
            <button
              key={t.title}
              type="button"
              title={t.title}
              aria-pressed={activeTool}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => apply(t)}
              className={cn(
                'rounded-lg border px-2.5 py-2 transition-colors',
                activeTool
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-card hover:text-foreground'
              )}
            >
              <t.icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      <div className="relative min-w-0">
        {!value && (
          <div className="pointer-events-none absolute left-4 top-4 z-10 text-sm text-muted-foreground/50">
            {placeholder}
          </div>
        )}
        <div
          ref={ref}
          role="textbox"
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          onInput={sync}
          onBlur={sync}
          onPaste={() => window.requestAnimationFrame(sync)}
          className={cn(
            'prose-neon min-h-[18rem] w-full overflow-y-auto bg-transparent p-4 text-sm outline-none',
            'focus:outline-none [&_a]:text-neon [&_blockquote]:border-l-2 [&_blockquote]:border-border/70 [&_blockquote]:pl-4',
            '[&_h2]:mt-0 [&_h2]:text-2xl [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border/70 [&_pre]:bg-background/60 [&_pre]:p-4',
            '[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5'
          )}
          style={{ minHeight }}
        />
        <div className="border-t border-border/60 bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
          Format selected text, then keep typing. The editor stores HTML as the
          source of truth.
        </div>
      </div>
    </div>
  );
}
