import slugify from 'slugify';

// `strict: true` drops every non-ASCII character, so a fully Bengali title slugifies to an empty string —
// which collides with the unique index and makes the record unreachable. Fall back to a percent-encodable
// Unicode slug (valid in a URL, and what Google expects for non-Latin scripts) before giving up on the id.
export const toSlug = (source: string, fallbackId: string): string => {
  const ascii = slugify(source, { lower: true, strict: true });
  if (ascii) return ascii;

  const unicode = slugify(source, { lower: true, trim: true })
    .replace(/[/?#[\]@!$&'()*+,;=%\\"<>{}|^`]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return unicode || fallbackId;
};
