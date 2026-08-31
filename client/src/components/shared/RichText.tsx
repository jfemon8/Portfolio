import { sanitizeRichText } from '@/lib/sanitizeRichText';

interface RichTextProps {
  html?: string;
  className?: string;
}

export default function RichText({ html = '', className = '' }: RichTextProps) {
  const clean = sanitizeRichText(html, document, window.location.origin);

  if (!clean) {
    return <div className={className} />;
  }

  return (
    <div
      className={`prose-neon break-words ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
