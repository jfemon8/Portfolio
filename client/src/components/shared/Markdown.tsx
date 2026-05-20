import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import { cn } from '@/lib/cn';

/**
 * The single premium long-form renderer (project rule #3) — GFM Markdown +
 * JS-theme syntax highlighting (no CSS file → rule #1). Uses the LIGHT
 * Prism build with only this stack's languages registered, so the content
 * chunk stays small (project rule #5 — performance).
 */
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('js', javascript);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('csharp', csharp);
SyntaxHighlighter.registerLanguage('sql', sql);

const components: Components = {
  a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
  // SyntaxHighlighter renders its own <pre>; collapse react-markdown's wrapper.
  pre: ({ children }) => <>{children}</>,
  // Wide tables scroll within the article instead of overflowing the page.
  table: (props) => (
    <div className="my-6 overflow-x-auto">
      <table {...props} />
    </div>
  ),
  code({ className, children }) {
    const match = /language-(\w+)/.exec(className || '');
    const text = String(children).replace(/\n$/, '');

    if (!match) {
      return (
        <code className="rounded-md border border-border/60 bg-card/70 px-1.5 py-0.5 font-mono text-[0.85em] text-neon">
          {children}
        </code>
      );
    }

    return (
      <div className="my-6 overflow-hidden rounded-xl border border-border/70">
        <div className="flex items-center justify-between border-b border-border/60 bg-card/60 px-4 py-2">
          <span className="font-mono text-xs text-muted-foreground/70">
            {match[1]}
          </span>
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
          </span>
        </div>
        <div className="overflow-x-auto">
          <SyntaxHighlighter
            language={match[1]}
            style={oneDark}
            customStyle={{
              margin: 0,
              background: 'hsl(var(--background))',
              fontSize: '0.85rem',
              padding: '1.1rem 1.25rem',
            }}
            codeTagProps={{ style: { fontFamily: 'inherit' } }}
          >
            {text}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  },
};

export default function Markdown({
  children,
  className,
}: {
  children?: string;
  className?: string;
}) {
  return (
    <div className={cn('prose-neon', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children || ''}
      </ReactMarkdown>
    </div>
  );
}
