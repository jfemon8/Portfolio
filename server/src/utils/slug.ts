import slugify from 'slugify';

// A fully Bengali title slugifies to an empty string under `strict: true`, so fall back to a percent-encodable Unicode slug before giving up on the id.
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
