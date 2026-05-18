import { useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Heading2,
  Code,
  Link2,
  List,
  Quote,
  Eye,
  Pencil,
} from 'lucide-react';
import Markdown from '@/components/shared/Markdown';
import { cn } from '@/lib/cn';

interface MarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}

type Tool = {
  icon: typeof Bold;
  title: string;
  wrap?: [string, string];
  line?: string;
};

const TOOLS: Tool[] = [
  { icon: Bold, title: 'Bold', wrap: ['**', '**'] },
  { icon: Italic, title: 'Italic', wrap: ['_', '_'] },
  { icon: Heading2, title: 'Heading', line: '## ' },
  { icon: Code, title: 'Code block', wrap: ['\n```\n', '\n```\n'] },
  { icon: Link2, title: 'Link', wrap: ['[', '](https://)'] },
  { icon: List, title: 'List item', line: '- ' },
  { icon: Quote, title: 'Quote', line: '> ' },
];

/**
 * Reusable rich Markdown editor — toolbar + live split preview, built on the
 * shared <Markdown/> renderer (project rule #3). Keeps Markdown as the single
 * source of truth (no separate rich-text format to reconcile).
 */
export default function MarkdownEditor({
  value,
  onChange,
  rows = 18,
  placeholder = '# Heading\n\nWrite in **Markdown**…',
}: MarkdownEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  const apply = (tool: Tool): void => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = value.slice(start, end);
    let next: string;
    let caret: number;

    if (tool.wrap) {
      const [a, b] = tool.wrap;
      next = value.slice(0, start) + a + sel + b + value.slice(end);
      caret = start + a.length + sel.length + b.length;
    } else {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      next =
        value.slice(0, lineStart) + (tool.line ?? '') + value.slice(lineStart);
      caret = end + (tool.line?.length ?? 0);
    }
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card/40">
      <div className="flex items-center gap-1 border-b border-border/60 bg-card/60 px-2 py-1.5">
        {TOOLS.map((t) => (
          <button
            key={t.title}
            type="button"
            title={t.title}
            onClick={() => apply(t)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-card hover:text-neon"
          >
            <t.icon className="h-4 w-4" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          {preview ? (
            <>
              <Pencil className="h-3.5 w-3.5" /> Write
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" /> Preview
            </>
          )}
        </button>
      </div>

      <div
        className={cn(
          'grid',
          preview ? 'lg:grid-cols-2 lg:divide-x lg:divide-border/60' : ''
        )}
      >
        {!preview && (
          <textarea
            ref={ref}
            rows={rows}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="w-full resize-y bg-transparent p-4 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
          />
        )}
        {preview && (
          <>
            <textarea
              ref={ref}
              rows={rows}
              value={value}
              placeholder={placeholder}
              onChange={(e) => onChange(e.target.value)}
              className="hidden w-full resize-y bg-transparent p-4 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/50 lg:block"
            />
            <div className="max-h-[60vh] overflow-y-auto p-5">
              <Markdown>{value || '_Nothing to preview yet._'}</Markdown>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
