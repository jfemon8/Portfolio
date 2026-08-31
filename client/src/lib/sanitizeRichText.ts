// Shared by <RichText> (browser `document`) and the prerender script (a jsdom `Document`), so the
// sanitizer that decides what a reader — and a non-JS crawler reading the prerendered HTML — sees
// is defined exactly once.

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
  'img',
  'sup',
  'sub',
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

// Block-level tags the editor lets an author align; text-align is the only style property that survives sanitizing.
const ALIGNABLE_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'blockquote',
  'li',
  'div',
  'td',
  'th',
]);

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const safeHref = (href: string, origin: string): string | null => {
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) return trimmed;

  try {
    const url = new URL(trimmed, origin);
    if (['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
};

// No data: URIs — images go through the editor's upload button, which always returns an http(s) Cloudinary URL.
const safeImageSrc = (src: string, origin: string): string | null => {
  const trimmed = src.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/')) return trimmed;

  try {
    const url = new URL(trimmed, origin);
    if (['http:', 'https:'].includes(url.protocol)) return url.toString();
  } catch {
    return null;
  }

  return null;
};

const safeTextAlign = (element: HTMLElement, tag: string): string => {
  if (!ALIGNABLE_TAGS.has(tag)) return '';
  const style = element.getAttribute('style');
  if (!style) return '';
  const match = /text-align\s*:\s*(left|center|right|justify)/i.exec(style);
  const value = match?.[1];
  return value ? ` style="text-align:${value.toLowerCase()}"` : '';
};

// Node.TEXT_NODE/ELEMENT_NODE are browser globals (unavailable under plain Node.js, unlike jsdom's
// DOM objects themselves), so these use the DOM spec's own stable numeric values instead.
const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

const serialize = (node: ChildNode, origin: string): string => {
  if (node.nodeType === TEXT_NODE) {
    return escapeHtml(node.textContent ?? '');
  }

  if (node.nodeType !== ELEMENT_NODE) return '';

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();

  if (tag === 'img') {
    const src = safeImageSrc(element.getAttribute('src') ?? '', origin);
    if (!src) return '';
    const alt = escapeHtml(element.getAttribute('alt') ?? '');
    return `<img src="${escapeHtml(src)}" alt="${alt}" />`;
  }

  const children = Array.from(element.childNodes)
    .map((n) => serialize(n, origin))
    .join('');

  if (!ALLOWED_TAGS.has(tag)) {
    return children;
  }

  if (tag === 'br' || tag === 'hr') {
    return `<${tag} />`;
  }

  if (tag === 'a') {
    const href = safeHref(element.getAttribute('href') ?? '', origin);
    if (!href) return children;
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer noopener">${children || escapeHtml(href)}</a>`;
  }

  if (tag === 'li' && !children.trim()) {
    return '<li><br /></li>';
  }

  const align = safeTextAlign(element, tag);

  if (tag === 'th' || tag === 'td') {
    // Only the attributes that carry table structure/alignment survive; anything else a paste brought along is dropped like every other attribute.
    const span = (name: string): string => {
      const n = Number(element.getAttribute(name));
      return Number.isInteger(n) && n > 1 && n <= 100 ? ` ${name}="${n}"` : '';
    };
    return `<${tag}${span('colspan')}${span('rowspan')}${align}>${children}</${tag}>`;
  }

  if (tag === 'table') {
    // Wrapped so a wide table scrolls inside its own box instead of pushing the article sideways on a phone.
    return `<div class="rt-table"><table>${children}</table></div>`;
  }

  if (BLOCK_TAGS.has(tag) && !children.trim()) {
    return `<${tag}${align}><br /></${tag}>`;
  }

  return `<${tag}${align}>${children}</${tag}>`;
};

/** `doc` is `document` in the browser and a jsdom `Document` at prerender time; `origin` resolves relative/protocol-checked URLs since a jsdom document has no `window.location`. */
export const sanitizeRichText = (
  html: string,
  doc: Document,
  origin: string
): string => {
  if (!html) return '';
  const template = doc.createElement('template');
  template.innerHTML = html;
  return Array.from(template.content.childNodes)
    .map((n) => serialize(n, origin))
    .join('');
};
