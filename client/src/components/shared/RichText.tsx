interface RichTextProps {
  html?: string;
  className?: string;
}

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'del',
  'ul',
  'ol',
  'li',
  'blockquote',
  'hr',
  'h1',
  'h2',
  'h3',
  'h4',
  'a',
  'code',
  'pre',
  'div',
  'span',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
]);

const BLOCK_TAGS = new Set([
  'p',
  'div',
  'blockquote',
  'pre',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
]);

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const safeHref = (href: string): string | null => {
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) return trimmed;

  try {
    const url = new URL(trimmed, window.location.origin);
    if (['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
};

const serialize = (node: ChildNode): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.textContent ?? '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes).map(serialize).join('');

  if (!ALLOWED_TAGS.has(tag)) {
    return children;
  }

  if (tag === 'br' || tag === 'hr') {
    return `<${tag} />`;
  }

  if (tag === 'a') {
    const href = safeHref(element.getAttribute('href') ?? '');
    if (!href) return children;
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer noopener">${children || escapeHtml(href)}</a>`;
  }

  if (tag === 'li' && !children.trim()) {
    return '<li><br /></li>';
  }

  if (tag === 'th' || tag === 'td') {
    // Only the two attributes that carry table structure survive; anything else a paste brought along is dropped like every other attribute.
    const span = (name: string): string => {
      const n = Number(element.getAttribute(name));
      return Number.isInteger(n) && n > 1 && n <= 100 ? ` ${name}="${n}"` : '';
    };
    return `<${tag}${span('colspan')}${span('rowspan')}>${children}</${tag}>`;
  }

  if (tag === 'table') {
    // Wrapped so a wide table scrolls inside its own box instead of pushing the article sideways on a phone.
    return `<div class="rt-table"><table>${children}</table></div>`;
  }

  if (BLOCK_TAGS.has(tag) && !children.trim()) {
    return `<${tag}><br /></${tag}>`;
  }

  return `<${tag}>${children}</${tag}>`;
};

const sanitizeRichText = (html: string): string => {
  if (!html) return '';
  const template = document.createElement('template');
  template.innerHTML = html;
  return Array.from(template.content.childNodes).map(serialize).join('');
};

export default function RichText({ html = '', className = '' }: RichTextProps) {
  const clean = sanitizeRichText(html);

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
