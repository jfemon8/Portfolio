import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Markdown({ children }: { children?: string }) {
  return (
    <div className="prose-neon">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // react-markdown supplies the link text as children via {...props}
          a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
        }}
      >
        {children || ''}
      </ReactMarkdown>
    </div>
  );
}
