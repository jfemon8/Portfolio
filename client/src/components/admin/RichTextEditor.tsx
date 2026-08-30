import { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Code2,
  Link2,
  Link2Off,
  Image as ImageIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Quote,
  Pencil,
  Table as TableIcon,
  Minus,
  Undo2,
  Redo2,
  Eraser,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import RichTextLinkModal from './RichTextLinkModal';
import RichTextImageModal from './RichTextImageModal';

interface RichTextEditorProps {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  /** Cloudinary folder for images inserted via the toolbar's upload tab. */
  folder?: string;
}

type Tool = {
  icon: typeof Bold;
  title: string;
  command: string;
  value?: string;
  activeKey?: ActiveKey;
};

type ActiveKey =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'quote'
  | 'codeBlock'
  | 'ul'
  | 'ol'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight';

type ActiveState = Record<ActiveKey, boolean> & { inlineCode: boolean };

// execCommand has no table command, so the button seeds real markup the author then types into.
const TABLE_SNIPPET =
  '<table><thead><tr><th>Heading</th><th>Heading</th><th>Heading</th></tr></thead>' +
  '<tbody><tr><td>Cell</td><td>Cell</td><td>Cell</td></tr>' +
  '<tr><td>Cell</td><td>Cell</td><td>Cell</td></tr></tbody></table><p><br /></p>';

const TOOL_GROUPS: Tool[][] = [
  [
    { icon: Undo2, title: 'Undo', command: 'undo' },
    { icon: Redo2, title: 'Redo', command: 'redo' },
  ],
  [
    { icon: Pilcrow, title: 'Paragraph', command: 'formatBlock', value: 'p' },
    {
      icon: Heading1,
      title: 'Heading 1',
      command: 'formatBlock',
      value: 'h1',
      activeKey: 'h1',
    },
    {
      icon: Heading2,
      title: 'Heading 2',
      command: 'formatBlock',
      value: 'h2',
      activeKey: 'h2',
    },
    {
      icon: Heading3,
      title: 'Heading 3',
      command: 'formatBlock',
      value: 'h3',
      activeKey: 'h3',
    },
  ],
  [
    { icon: Bold, title: 'Bold', command: 'bold', activeKey: 'bold' },
    { icon: Italic, title: 'Italic', command: 'italic', activeKey: 'italic' },
    {
      icon: Underline,
      title: 'Underline',
      command: 'underline',
      activeKey: 'underline',
    },
    {
      icon: Strikethrough,
      title: 'Strikethrough',
      command: 'strikeThrough',
      activeKey: 'strike',
    },
  ],
  [
    {
      icon: Quote,
      title: 'Quote',
      command: 'formatBlock',
      value: 'blockquote',
      activeKey: 'quote',
    },
    {
      icon: Code,
      title: 'Code block',
      command: 'formatBlock',
      value: 'pre',
      activeKey: 'codeBlock',
    },
  ],
  [
    {
      icon: List,
      title: 'Bullet list',
      command: 'insertUnorderedList',
      activeKey: 'ul',
    },
    {
      icon: ListOrdered,
      title: 'Numbered list',
      command: 'insertOrderedList',
      activeKey: 'ol',
    },
  ],
  [
    {
      icon: AlignLeft,
      title: 'Align left',
      command: 'justifyLeft',
      activeKey: 'alignLeft',
    },
    {
      icon: AlignCenter,
      title: 'Align center',
      command: 'justifyCenter',
      activeKey: 'alignCenter',
    },
    {
      icon: AlignRight,
      title: 'Align right',
      command: 'justifyRight',
      activeKey: 'alignRight',
    },
  ],
  [
    {
      icon: TableIcon,
      title: 'Table',
      command: 'insertHTML',
      value: TABLE_SNIPPET,
    },
    { icon: Minus, title: 'Horizontal rule', command: 'insertHorizontalRule' },
    { icon: Link2Off, title: 'Remove link', command: 'unlink' },
  ],
  [{ icon: Eraser, title: 'Clear formatting', command: 'removeFormat' }],
];

const initialActiveState: ActiveState = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  h1: false,
  h2: false,
  h3: false,
  quote: false,
  codeBlock: false,
  inlineCode: false,
  ul: false,
  ol: false,
  alignLeft: false,
  alignCenter: false,
  alignRight: false,
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

// A bare "example.com" is treated as a hostname (https:// prepended); anything with an explicit scheme, or a site-relative /path or #anchor, passes through untouched.
const normalizeUrl = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;
  return `https://${trimmed}`;
};

export default function RichTextEditor({
  value,
  onChange,
  rows = 12,
  placeholder = 'Write your content here...',
  folder = 'portfolio/richtext',
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [active, setActive] = useState<ActiveState>(initialActiveState);
  const [linkModal, setLinkModal] = useState<{
    open: boolean;
    url: string;
    text: string;
  }>({ open: false, url: '', text: '' });
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const minHeight = `${Math.max(rows, 6) * 1.35 + 2.5}rem`;

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
      const block = anchorElement?.closest('h1,h2,h3,pre,blockquote,li');
      const list = anchorElement?.closest('ul,ol');
      const inlineCodeEl = anchorElement?.closest('code');

      setActive({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        h1: block?.tagName === 'H1',
        h2: block?.tagName === 'H2',
        h3: block?.tagName === 'H3',
        quote: block?.tagName === 'BLOCKQUOTE',
        codeBlock: block?.tagName === 'PRE',
        inlineCode: !!inlineCodeEl,
        ul: list?.tagName === 'UL',
        ol: list?.tagName === 'OL',
        alignLeft: document.queryCommandState('justifyLeft'),
        alignCenter: document.queryCommandState('justifyCenter'),
        alignRight: document.queryCommandState('justifyRight'),
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

  const applyCommand = (tool: Tool): void => {
    const editable = ref.current;
    if (!editable) return;
    editable.focus();
    document.execCommand(tool.command, false, tool.value);
    window.requestAnimationFrame(sync);
  };

  /** Remembers the current selection so it can be restored after a modal steals focus. */
  const saveSelection = (): void => {
    const editable = ref.current;
    const selection = window.getSelection();
    if (
      editable &&
      selection &&
      selection.rangeCount > 0 &&
      editable.contains(selection.anchorNode)
    ) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    } else {
      savedRangeRef.current = null;
    }
  };

  const restoreSelection = (): void => {
    const editable = ref.current;
    if (!editable) return;
    editable.focus();
    const selection = window.getSelection();
    if (selection && savedRangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    }
  };

  const toggleInlineCode = (): void => {
    const editable = ref.current;
    const selection = window.getSelection();
    if (!editable || !selection || selection.rangeCount === 0) return;
    editable.focus();

    const anchorElement =
      (selection.anchorNode instanceof HTMLElement
        ? selection.anchorNode
        : selection.anchorNode?.parentElement) ?? null;
    const codeEl = anchorElement?.closest('code');

    if (codeEl && editable.contains(codeEl)) {
      codeEl.replaceWith(document.createTextNode(codeEl.textContent ?? ''));
    } else {
      const range = selection.getRangeAt(0);
      const text = range.toString();
      if (!text) return;
      document.execCommand(
        'insertHTML',
        false,
        `<code>${escapeHtml(text)}</code>`
      );
    }
    window.requestAnimationFrame(sync);
  };

  const openLinkModal = (): void => {
    const editable = ref.current;
    if (!editable) return;
    const selection = window.getSelection();
    const anchorNode =
      selection && editable.contains(selection.anchorNode)
        ? selection.anchorNode
        : null;
    const anchorElement =
      (anchorNode instanceof HTMLElement
        ? anchorNode
        : anchorNode?.parentElement) ?? null;
    const existingLink = anchorElement?.closest('a');

    if (existingLink && editable.contains(existingLink)) {
      const range = document.createRange();
      range.selectNode(existingLink);
      savedRangeRef.current = range;
      setLinkModal({
        open: true,
        url: existingLink.getAttribute('href') ?? '',
        text: existingLink.textContent ?? '',
      });
    } else {
      saveSelection();
      setLinkModal({ open: true, url: '', text: selection?.toString() ?? '' });
    }
  };

  const handleLinkSubmit = (url: string, text: string): void => {
    const safeUrl = normalizeUrl(url);
    setLinkModal((s) => ({ ...s, open: false }));
    if (!safeUrl) return;
    restoreSelection();
    const label = text || safeUrl;
    document.execCommand(
      'insertHTML',
      false,
      `<a href="${escapeHtml(safeUrl)}">${escapeHtml(label)}</a>`
    );
    window.requestAnimationFrame(sync);
  };

  const openImageModal = (): void => {
    saveSelection();
    setImageModalOpen(true);
  };

  const handleImageSubmit = (url: string, alt: string): void => {
    setImageModalOpen(false);
    restoreSelection();
    document.execCommand(
      'insertHTML',
      false,
      `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" />`
    );
    window.requestAnimationFrame(sync);
  };

  const isActive = (tool: Tool): boolean =>
    tool.activeKey ? active[tool.activeKey] : false;

  const toolButtonClass = (isOn: boolean): string =>
    cn(
      'rounded-lg border px-2.5 py-2 transition-colors',
      isOn
        ? 'border-primary/40 bg-primary/10 text-primary'
        : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-card hover:text-foreground'
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-1 border-b border-border/60 bg-muted/35 px-2.5 py-2">
        <div className="mr-2 hidden items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-2xs font-medium text-muted-foreground sm:flex">
          <Pencil className="h-3 w-3" />
          Rich text editor
        </div>

        {TOOL_GROUPS.map((group, i) => (
          <div
            key={i}
            className="flex items-center gap-1 border-r border-border/60 pr-1 last:border-r-0"
          >
            {group.map((t) => (
              <button
                key={t.title}
                type="button"
                title={t.title}
                aria-pressed={isActive(t)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyCommand(t)}
                className={toolButtonClass(isActive(t))}
              >
                <t.icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        ))}

        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Inline code"
            aria-pressed={active.inlineCode}
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleInlineCode}
            className={toolButtonClass(active.inlineCode)}
          >
            <Code2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Insert link"
            onMouseDown={(e) => e.preventDefault()}
            onClick={openLinkModal}
            className={toolButtonClass(false)}
          >
            <Link2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Insert image"
            onMouseDown={(e) => e.preventDefault()}
            onClick={openImageModal}
            className={toolButtonClass(false)}
          >
            <ImageIcon className="h-4 w-4" />
          </button>
        </div>
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
            '[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5',
            '[&_table]:w-full [&_table]:border-collapse [&_th]:border [&_td]:border [&_th]:border-border/60 [&_td]:border-border/60 [&_th]:px-3 [&_td]:px-3 [&_th]:py-2 [&_td]:py-2 [&_th]:bg-muted/40 [&_th]:text-left'
          )}
          style={{ minHeight }}
        />
        <div className="border-t border-border/60 bg-muted/20 px-4 py-2 text-2xs text-muted-foreground">
          Format selected text, then keep typing. Use the link and image buttons
          to insert media — the editor stores HTML as the source of truth.
        </div>
      </div>

      <RichTextLinkModal
        open={linkModal.open}
        initialUrl={linkModal.url}
        initialText={linkModal.text}
        onClose={() => setLinkModal((s) => ({ ...s, open: false }))}
        onSubmit={handleLinkSubmit}
      />
      <RichTextImageModal
        open={imageModalOpen}
        folder={folder}
        onClose={() => setImageModalOpen(false)}
        onSubmit={handleImageSubmit}
      />
    </div>
  );
}
