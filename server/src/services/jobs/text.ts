import { bangladeshDay, bangladeshDayBefore } from '../../utils/bdDate.js';
import type {
  JobAttachment,
  JobCategory,
  JobRegion,
} from '../../types/index.js';

/** Shared text, date and classification helpers for every job source adapter. */
const DAY_MS = 86_400_000;
/* ------------------------------------------------------------------ text */

const NAMED_ENTITIES: Record<string, string> = {
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  bull: '•',
  middot: '·',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  eacute: 'é',
  deg: '°',
  euro: '€',
  pound: '£',
  trade: '™',
  copy: '©',
  reg: '®',
};

const codePoint = (value: number): string => {
  if (!Number.isFinite(value) || value < 0 || value > 0x10ffff) return '';
  try {
    return String.fromCodePoint(value);
  } catch {
    return '';
  }
};

// `&amp;` is decoded last so `&amp;lt;` yields the literal text `&lt;`, not a tag.
export const decodeEntities = (value: string): string =>
  value
    .replace(/&#x([0-9a-f]{1,6});/gi, (_m, hex: string) =>
      codePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d{1,7});/g, (_m, dec: string) => codePoint(Number(dec)))
    .replace(
      /&([a-z]+);/gi,
      (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match
    )
    .replace(/&(?:amp|#38);/gi, '&');

const unwrapCdata = (value: string): string =>
  value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

/** Turns feed HTML into text, keeping paragraphs and bullets as real line breaks. */
export const htmlToText = (input: string): string => {
  if (!input) return '';
  let value = decodeEntities(unwrapCdata(input));
  if (/&[a-z#][a-z0-9]{1,8};/i.test(value)) value = decodeEntities(value);

  return (
    value
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(
        /<\/(?:p|div|h[1-6]|blockquote|tr|section|article|ul|ol|li)>/gi,
        '\n'
      )
      .replace(
        /<(?:p|div|h[1-6]|blockquote|tr|section|article|ul|ol|table)[^>]*>/gi,
        '\n'
      )
      .replace(/<[^>]*>/g, ' ')
      .replace(/\r\n?/g, '\n')
      // Also normalises the non-breaking spaces these feeds are full of.
      .replace(/[^\S\n]+/g, ' ')
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
};

/** Single-line variant for titles, companies and URLs. */
export const oneLine = (input: string): string =>
  htmlToText(input).replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------------------ dates */

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const pad = (value: number): string => String(value).padStart(2, '0');

/** Builds `YYYY-MM-DD`, rejecting impossible days such as 31 February. */
export const calendarDay = (
  year: number,
  month: number,
  day: number
): string | undefined => {
  if (year < 1970 || year > 2100 || month < 1 || month > 12 || day < 1)
    return undefined;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCMonth() + 1 !== month || probe.getUTCDate() !== day)
    return undefined;
  return `${year}-${pad(month)}-${pad(day)}`;
};

/** Parses the date formats Bangladeshi job feeds actually use — including `D/M/YYYY`. */
export const parseLooseDate = (input: string): string | undefined => {
  const value = input.trim();

  const iso = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value);
  if (iso) return calendarDay(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const numeric = /\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})\b/.exec(value);
  if (numeric)
    return calendarDay(
      Number(numeric[3]),
      Number(numeric[2]),
      Number(numeric[1])
    );

  const dayFirst =
    /\b(\d{1,2})(?:st|nd|rd|th)?[\s,]+([A-Za-z]{3,9})\.?[\s,]+(\d{4})\b/.exec(
      value
    );
  if (dayFirst) {
    const month = MONTHS[(dayFirst[2] ?? '').toLowerCase()];
    if (month)
      return calendarDay(Number(dayFirst[3]), month, Number(dayFirst[1]));
  }

  const monthFirst =
    /\b([A-Za-z]{3,9})\.?[\s,]+(\d{1,2})(?:st|nd|rd|th)?[\s,]+(\d{4})\b/.exec(
      value
    );
  if (monthFirst) {
    const month = MONTHS[(monthFirst[1] ?? '').toLowerCase()];
    if (month)
      return calendarDay(Number(monthFirst[3]), month, Number(monthFirst[2]));
  }

  return undefined;
};

export const asDate = (value: unknown): Date | undefined => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export const asTimestampDate = (value: unknown): Date | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/** A wildly future timestamp is bad feed data — drop it rather than pin the item to the top forever. */
export const sanePublishedAt = (date?: Date): Date | undefined =>
  date && date.getTime() <= Date.now() + DAY_MS ? date : undefined;

export const asDeadline = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  // A timestamped deadline is resolved in Dhaka, so a late-evening UTC value keeps its local day.
  if (/\d{1,2}:\d{2}/.test(text)) {
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) return bangladeshDay(parsed);
  }
  return parseLooseDate(text);
};

const DEADLINE_LABEL =
  /(?:application\s+)?(?:dead\s?line|last\s+date(?:\s+of\s+(?:application|submission))?|closing\s+date|apply\s+(?:by|before|within)|expires?\s+on)\s*[:\-–—]?\s*/i;

/** Reads the deadline out of prose, since most feeds state it nowhere else. */
export const deadlineFromText = (text: string): string | undefined => {
  const label = DEADLINE_LABEL.exec(text);
  if (!label) return undefined;
  const from = label.index + label[0].length;
  const candidate = parseLooseDate(text.slice(from, from + 60));
  if (!candidate) return undefined;
  // Guards against picking up a publication date or an unrelated year.
  const earliest = bangladeshDayBefore(15);
  const latest = bangladeshDayBefore(-400);
  return candidate >= earliest && candidate <= latest ? candidate : undefined;
};

/* ------------------------------------------------------------- classifier */

const CATEGORY_RULES: Array<{ category: JobCategory; pattern: RegExp }> = [
  {
    category: 'bank',
    pattern:
      /\b(bank|banking|banker|nbfi|financial institution|microfinance|insurance)\b/,
  },
  {
    category: 'government',
    pattern:
      /\b(ministry|govt\.?|government|directorate|department of|office of the|controller general|comptroller|public service commission|bpsc|bangladesh public|city corporation|union parishad|upazila|zila|district commissioner|deputy commissioner|autonomous body|national board of revenue|nbr|bangladesh (?:army|navy|air force|police|railway|betar|bank|forest|water development|rural development|madrasah|education board|computer council|atomic energy)|cantonment|secretariat|regulatory (?:authority|commission)|statutory)\b/,
  },
  {
    category: 'ngo',
    pattern:
      /\b(ngo|i-?ngo|foundation|non-?government|humanitarian|unicef|undp|brac|save the children|world vision)\b/,
  },
  {
    category: 'it',
    pattern:
      /\b(software|developer|engineer|programmer|devops|qa engineer|sqa|frontend|front-end|backend|back-end|full-?stack|data (?:analyst|scientist|engineer)|machine learning|cyber ?security|network|sysadmin|it (?:officer|executive|support|manager|specialist)|ict)\b/,
  },
];

export const classify = (
  text: string,
  preferred?: JobCategory
): JobCategory => {
  if (preferred) return preferred;
  const value = text.toLowerCase();
  return (
    CATEGORY_RULES.find((rule) => rule.pattern.test(value))?.category ??
    'private'
  );
};

const EMPLOYMENT_TYPES: Array<[label: string, pattern: RegExp]> = [
  ['Full-time', /\bfull[-\s]?time\b/],
  ['Part-time', /\bpart[-\s]?time\b/],
  ['Internship', /\bintern(?:ship)?\b/],
  ['Contract', /\bcontractual?\b/],
  ['Temporary', /\btemporary\b/],
  ['Freelance', /\bfreelance\b/],
  ['Remote', /\bremote\b/],
];

export const employmentTypeFrom = (text: string): string => {
  const value = text.toLowerCase();
  return EMPLOYMENT_TYPES.find(([, pattern]) => pattern.test(value))?.[0] ?? '';
};

/* --------------------------------------------------------------- location */

const BANGLADESH_PLACES =
  /\b(bangladesh|dhaka|chattogram|chittagong|khulna|rajshahi|sylhet|barishal|barisal|rangpur|mymensingh|gazipur|narayanganj|cumilla|comilla|bogura|jashore|jessore|savar|tongi|narsingdi|banani|gulshan|uttara|motijheel|dhanmondi)\b/i;

export const isBangladeshLocation = (location: string): boolean =>
  BANGLADESH_PLACES.test(location);

/** Keeps a Bangladesh-first board coherent once worldwide sources are mixed in. */
export const regionOf = (location: string, remoteHint = false): JobRegion => {
  if (isBangladeshLocation(location)) return 'bangladesh';
  if (remoteHint || /\b(remote|anywhere|work from home|wfh)\b/i.test(location))
    return 'remote';
  return 'international';
};

/* ------------------------------------------------------------ attachments */

// GIF is excluded deliberately: on these boards it is always a badge or spacer.
const IMAGE_EXTENSIONS = /\.(?:png|jpe?g|webp)(?:$|[?#])/i;
const PDF_EXTENSION = /\.pdf(?:$|[?#])/i;
/** Site furniture that would otherwise be mistaken for a scanned circular. */
const CHROME_ASSET =
  /(?:logo|icon|favicon|banner|header|footer|sprite|avatar|thumb|placeholder|ads?bygoogle|facebook|twitter|whatsapp|social|arrow|button|spacer|blank|shim|\b\d+pix?\b|bg[-_])/i;
/** Directories that hold a site's own furniture rather than uploaded content. */
const CHROME_DIRECTORY =
  /\/(?:resource|resources|assets|static|theme|themes|template|templates|icons|css|js)\//i;
/** Uploaded circulars often live under an `assets` path, so this wins over the rule above. */
const CONTENT_PATH =
  /(?:upload|circular|notice|attachment|media|storage|document)/i;

const normaliseUrl = (url: string): string =>
  url.replace(/^http:/i, 'https:').replace('://www.', '://');

const absoluteUrl = (href: string, base: string): string | null => {
  try {
    const url = new URL(href.trim(), base);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

/** Collects the scanned circular or PDF notice a posting was published as. */
export const extractAttachments = (
  html: string,
  base: string,
  limit = 4
): JobAttachment[] => {
  const found = new Map<string, JobAttachment>();

  const add = (raw: string, type: 'image' | 'pdf', label: string): void => {
    const url = absoluteUrl(raw, base);
    if (!url) return;
    // http/https and www variants of one asset must collapse to a single entry.
    const key = normaliseUrl(url);
    if (found.size >= limit || found.has(key)) return;
    if (CHROME_ASSET.test(url)) return;
    if (CHROME_DIRECTORY.test(url) && !CONTENT_PATH.test(url)) return;
    found.set(key, { url: key, type, label: label.slice(0, 160) });
  };

  // A circular's own og:image is the scan itself on most Bangladeshi boards.
  const og =
    /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i.exec(
      html
    )?.[1];
  if (og && IMAGE_EXTENSIONS.test(og)) add(og, 'image', 'Circular');

  // Uploaded scans share one directory, so the rest are judged by whether they sit beside it.
  const uploadDir = og
    ? (absoluteUrl(og, base) ?? '').replace(/[^/]*$/, '')
    : '';

  for (const match of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
    const src = match[1] ?? '';
    if (!IMAGE_EXTENSIONS.test(src)) continue;
    if (uploadDir) {
      const resolved = normaliseUrl(absoluteUrl(src, base) ?? '');
      if (!resolved.startsWith(normaliseUrl(uploadDir))) continue;
    }
    // A declared width under 200px is a decoration, never a readable circular.
    const width = Number(/\bwidth=["']?(\d+)/i.exec(match[0])?.[1] ?? 0);
    if (width > 0 && width < 200) continue;
    const alt = /alt=["']([^"']*)["']/i.exec(match[0])?.[1] ?? '';
    add(src, 'image', oneLine(alt) || 'Circular');
  }

  for (const match of html.matchAll(
    /<a[^>]+href=["']([^"']+\.pdf[^"']*)["'][^>]*>/gi
  )) {
    const href = match[1] ?? '';
    if (!PDF_EXTENSION.test(href)) continue;
    add(href, 'pdf', 'Notice (PDF)');
  }

  return [...found.values()];
};

/* ------------------------------------------------------- circular titles */

/** Words that begin the "…recruitment circular 2026" tail of a Bengali headline. */
const CIRCULAR_TAIL = [
  'নিয়োগ',
  'চাকরির',
  'চাকরি',
  'বিজ্ঞপ্তি',
  'job circular',
  'recruitment',
  'circular',
];

/** Cuts the "recruitment circular <year>" tail off a headline by index, since Bengali carries zero-width joiners. */
export const employerFromCircularTitle = (title: string): string => {
  // NFC first: Bengali `য়` ships pre-composed and as base + nukta, and the two never match as plain strings.
  const head = (title.normalize('NFC').split('|')[0] ?? title)
    .replace(/^\s*(?:চলমান|নতুন|সর্বশেষ)\s+/u, '')
    .trim();
  const lower = head.toLowerCase();
  const cut = CIRCULAR_TAIL.map((word) =>
    lower.indexOf(word.normalize('NFC').toLowerCase())
  )
    .filter((index) => index > 0)
    .sort((a, b) => a - b)[0];
  return (cut === undefined ? head : head.slice(0, cut))
    .replace(/[\s\-–—|,:।]+$/u, '')
    .trim();
};
