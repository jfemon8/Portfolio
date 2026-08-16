/** Turns feed-supplied job text into safe, structured HTML for RichText to render. */
const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const SECTION_TITLES = [
  'About the Role',
  'About the Company',
  'About Us',
  'Who We Are',
  'Company Overview',
  'Job Overview',
  'Overview',
  'Job Description',
  'Job Context',
  'Job Summary',
  'Job Nature',
  'Job Responsibilities',
  'Key Job Responsibilities',
  'Responsibilities and Duties',
  'Key Responsibilities',
  'Duties and Responsibilities',
  'Responsibilities',
  "What You'll Do",
  'What You’ll Do',
  "What You'll Bring",
  'What You’ll Bring',
  "What We're Looking For",
  'What We’re Looking For',
  'What You Need',
  'Educational Requirements',
  'Experience Requirements',
  'Additional Requirements',
  'Minimum Qualifications',
  'Preferred Qualifications',
  'Requirements',
  'Qualifications',
  'Required Skills',
  'Skills & Expertise',
  'Skills',
  'Compensation & Other Benefits',
  'Compensation and Benefits',
  'Perks and Benefits',
  'Benefits',
  'Salary',
  'Workplace',
  'Job Location',
  'Employment Status',
  'Vacancy',
  'Why Join Us',
  'Equal Opportunity',
  'How to Apply',
  'Application Procedure',
  'Application Deadline',
  'Read Before Apply',
];

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Longest first, so "Key Responsibilities" is never truncated to "Responsibilities".
const sectionPattern = [...SECTION_TITLES]
  .sort((a, b) => b.length - a.length)
  .map(escapeRegExp)
  .join('|');
// The trailing run deliberately stops at a newline so a label can't swallow the next line.
const FIELD_LABEL =
  /(?:^|\s)([A-Z][A-Za-z0-9’'/-]*(?:\s+[A-Z][A-Za-z0-9’'/-]*){0,4}):[^\S\n]*/g;

const renderParagraph = (text: string): string => {
  const bullet = /^[•\-*]\s*/.exec(text);
  const body = escapeHtml(bullet ? text.slice(bullet[0].length) : text).replace(
    /@@FIELD:([^@]+)@@/g,
    '<strong>$1:</strong>'
  );
  return bullet ? `<li>${body}</li>` : `<p>${body}</p>`;
};

/** A short, unpunctuated, title-cased line on its own is a heading in practically every posting. */
const looksLikeHeading = (line: string): boolean => {
  if (line.length > 60 || /[.,;:!?]$/.test(line) || line.includes(':'))
    return false;
  // Bullets are list items, and a year or leading digit means a value, not a heading.
  if (/^[•\-*\d]/.test(line) || /\b\d{4}\b/.test(line)) return false;
  const words = line.split(/\s+/);
  if (words.length < 2 || words.length > 8) return false;
  const capitalised = words.filter((word) => /^[A-Z0-9]/.test(word)).length;
  return capitalised / words.length >= 0.6;
};

/** Groups consecutive `<li>` output into real lists so bullets aren't orphaned. */
const wrapLists = (blocks: string[]): string => {
  let html = '';
  let open = false;
  for (const block of blocks) {
    const isItem = block.startsWith('<li>');
    if (isItem && !open) {
      html += '<ul>';
      open = true;
    } else if (!isItem && open) {
      html += '</ul>';
      open = false;
    }
    html += block;
  }
  return open ? `${html}</ul>` : html;
};

/** Honours the source structure first; the heuristics only rescue feeds that arrive flat. */
export const formatJobDescription = (description: string): string => {
  if (!description.trim()) return '';
  if (/<(?:p|h[1-6]|ul|ol|li|br|div|blockquote|pre)\b/i.test(description)) {
    return description;
  }

  const normalized = description
    .replace(/&nbsp;/gi, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\r\n?/g, '\n');

  // A single-line description means the source flattened it — rebuild the breaks.
  const withBreaks = normalized.includes('\n')
    ? normalized
    : normalized
        .replace(/\s+/g, ' ')
        .replace(
          new RegExp(`(?:^|\\s)(${sectionPattern})(?=\\s|:|$)`, 'gi'),
          (_match, title: string) => `\n\n@@SECTION:${title.trim()}@@\n`
        );

  // Heading inference is only safe where the source kept its own line breaks.
  const structured = normalized.includes('\n');
  // A bullet mid-line is always a list item that lost its break.
  const marked = withBreaks
    .replace(/\s+•\s+/g, '\n• ')
    .replace(
      FIELD_LABEL,
      (match: string, label: string, offset: number, whole: string) => {
        const clean = label.trim();
        // A section title is only a heading when no value follows it on the line.
        const leads = /^(?:\n|•|$)/.test(whole.slice(offset + match.length));
        return leads &&
          SECTION_TITLES.some(
            (title) => title.toLowerCase() === clean.toLowerCase()
          )
          ? `\n${clean}\n`
          : `\n@@FIELD:${clean}@@ `;
      }
    );

  return marked
    .split(/(@@SECTION:[^@]+@@)/)
    .filter(Boolean)
    .map((chunk) => {
      const section = /^@@SECTION:([^@]+)@@$/.exec(chunk.trim());
      if (section) return `<h3>${escapeHtml(section[1] ?? '')}</h3>`;
      const blocks = chunk
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const bare = line.replace(/:$/, '');
          const isHeading =
            SECTION_TITLES.some(
              (title) => title.toLowerCase() === bare.toLowerCase()
            ) ||
            (structured && looksLikeHeading(line));
          return isHeading
            ? `<h3>${escapeHtml(bare)}</h3>`
            : renderParagraph(line);
        });
      return wrapLists(blocks);
    })
    .join('');
};
