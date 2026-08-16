import type { ToolKey } from '@/types';

/** Everything a tool page needs to compete for its keyword, beyond the name and blurb the admin sets. */
export interface ToolSeo {
  /** Title tag; lead with the phrase people actually type, not the brand. */
  title: string;
  description: string;
  keywords: string[];
  features: string[];
}

export const TOOL_SEO: Partial<Record<ToolKey, ToolSeo>> = {
  'jwt-decoder': {
    title: 'JWT Decoder Online — Decode JSON Web Tokens Free',
    description:
      'Decode a JWT online and read its header, payload and claims instantly. Shows expiry in plain English. Runs in your browser — your token is never uploaded.',
    keywords: [
      'jwt decoder',
      'decode jwt online',
      'json web token decoder',
      'jwt parser',
      'jwt payload viewer',
      'jwt expiry checker',
      'free jwt decoder',
    ],
    features: [
      'Decodes header, payload and signature segments',
      'Translates exp, iat and nbf claims into readable dates',
      'Shows at a glance whether the token has expired',
      'Syntax-highlighted JSON output with one-click copy',
      'Works offline — the token never leaves your browser',
    ],
  },

  'json-formatter': {
    title: 'JSON Formatter & Validator Online — Free Beautifier',
    description:
      'Format, beautify, validate and minify JSON online. Pinpoints syntax errors by line and column. Free, no sign-up, and your data never leaves the browser.',
    keywords: [
      'json formatter',
      'json beautifier',
      'json validator',
      'format json online',
      'json pretty print',
      'minify json',
      'json syntax checker',
    ],
    features: [
      'Beautify with 2-space or 4-space indentation',
      'Minify to the smallest valid JSON',
      'Validates as you type and reports the exact line and column of an error',
      'Syntax-highlighted output with one-click copy',
      'Handles large documents without freezing the page',
    ],
  },

  'regex-tester': {
    title: 'Regex Tester Online — Test & Debug Regular Expressions',
    description:
      'Test regular expressions live with highlighted matches and colour-coded capture groups. Catches catastrophic backtracking instead of freezing your tab.',
    keywords: [
      'regex tester',
      'regular expression tester',
      'regex online',
      'test regex',
      'regex debugger',
      'javascript regex tester',
      'regex match highlighter',
    ],
    features: [
      'Live match highlighting as you type',
      'Each capture group shown in its own colour',
      'Ready-made patterns for email, URL, IPv4, hex colour, date and phone',
      'Matching runs in a worker, so a runaway pattern never freezes the page',
      'Warns you when a pattern is backtracking catastrophically',
    ],
  },

  'password-crack-time': {
    title: 'Password Strength Checker — How Long To Crack My Password',
    description:
      'Find out how long your password would take to crack, benchmarked on your own device. Checks against common-password lists. Nothing is transmitted or stored.',
    keywords: [
      'password strength checker',
      'how long to crack my password',
      'password crack time calculator',
      'is my password strong',
      'password entropy calculator',
      'check password security',
    ],
    features: [
      'Crack-time estimates for offline, online and targeted attack scenarios',
      'Benchmarks your actual device to ground the numbers in real hashing speed',
      'Flags dictionary words, names, dates, keyboard walks and leetspeak',
      'Explains what is weak about the password rather than only scoring it',
      'The password is never sent anywhere — not even hashed',
    ],
  },

  'pdf-power-tools': {
    title: 'Free PDF Tools Online — Merge, Split, Compress, Sign & Edit',
    description:
      'Merge, split, compress, edit and sign PDF files free in your browser. No upload, no watermark, no sign-up — your documents never leave your device.',
    keywords: [
      'pdf tools online free',
      'merge pdf',
      'split pdf',
      'compress pdf',
      'edit pdf online',
      'sign pdf online free',
      'pdf editor no watermark',
      'combine pdf files',
    ],
    features: [
      'Merge any number of PDFs and reorder pages by dragging',
      'Split by page range or extract single pages',
      'Compress to a smaller file while keeping text readable',
      'Edit text, headers, footers, page numbers, watermarks and images with a live preview',
      'Draw, type or upload a signature and place it anywhere',
      'Export to an editable Word document',
      'No upload, no watermark and no page limit',
    ],
  },

  'image-to-text': {
    title: 'Image to Text Converter — Free OCR for English & Bangla',
    description:
      'Extract text from images free with OCR that reads both English and Bengali. Download as .txt or an editable .docx. Runs in your browser — images never uploaded.',
    keywords: [
      'image to text',
      'ocr online free',
      'extract text from image',
      'bangla ocr',
      'bengali ocr online',
      'photo to text converter',
      'picture to text',
      'image to word converter',
    ],
    features: [
      'Reads both English and Bengali, detected automatically',
      'Keeps the original layout, including columns and table rows',
      'Exports as plain .txt or an editable .docx',
      'Handles several images in one go',
      'Images are processed on your device and never uploaded',
    ],
  },

  'email-verifier': {
    title: 'Email Extractor & Verifier — Find and Validate Emails Free',
    description:
      'Pull every email address out of any text and check which are deliverable. Syntax, domain, MX and disposable-address checks, then export to CSV. Free.',
    keywords: [
      'email extractor',
      'email verifier',
      'email validation tool',
      'extract emails from text',
      'bulk email checker',
      'verify email address free',
      'disposable email detector',
    ],
    features: [
      'Extracts every address from pasted text or an uploaded file',
      'Removes duplicates and normalises addresses automatically',
      'Checks syntax, domain, MX records and disposable providers',
      'Sorts results into valid, risky, invalid and unknown',
      'Exports the verified list to CSV',
    ],
  },

  'music-remover': {
    title: 'Vocal Remover & Music Separator — Free Karaoke Maker',
    description:
      'Split any song into vocals and instrumental free in your browser. Make karaoke tracks or acapellas with no upload, no sign-up and no processing queue.',
    keywords: [
      'vocal remover',
      'remove vocals from song',
      'music separator',
      'karaoke maker',
      'acapella extractor',
      'instrumental maker',
      'split vocals and music free',
    ],
    features: [
      'Separates a track into a vocal stem and an instrumental stem',
      'Runs entirely on your device — no upload and no queue',
      'Preview both stems before downloading',
      'Downloads as standard WAV files',
      'No account, no watermark and no track limit',
    ],
  },

  'resume-ats-xray': {
    title: 'Free ATS Resume Checker — Scan Your CV For Applicant Tracking',
    description:
      'See your resume the way an applicant tracking system does. Checks parsing, keyword match against the job description, formatting traps and contact details.',
    keywords: [
      'ats resume checker',
      'resume scanner free',
      'applicant tracking system test',
      'ats friendly resume check',
      'cv keyword match',
      'resume parser online',
    ],
    features: [
      'Shows exactly what text an ATS can extract from your file',
      'Matches your resume against a pasted job description',
      'Flags tables, columns, headers and graphics that parse badly',
      'Checks that contact details and section headings are machine-readable',
      'Lists the missing keywords worth adding',
    ],
  },

  'bigo-benchmark': {
    title: 'Big-O Complexity Analyser — Benchmark Your Code Online',
    description:
      'Measure how your JavaScript or Python function actually scales. Runs it across growing inputs, fits the curve and names the complexity, with a live chart.',
    keywords: [
      'big o calculator',
      'time complexity analyzer',
      'benchmark javascript function',
      'algorithm complexity checker',
      'measure code performance online',
      'big o notation tool',
    ],
    features: [
      'Runs your function over a growing range of input sizes',
      'Fits the measurements and names the closest complexity class',
      'Live chart of measured time against the fitted curve',
      'Supports both JavaScript and Python',
      'Executes in a sandboxed worker with a watchdog for infinite loops',
    ],
  },

  'cf-rating-predictor': {
    title: 'Codeforces Rating Predictor — Estimate Your Rating Change',
    description:
      'Predict your Codeforces rating change from a contest rank. Uses the Elo-based system Codeforces itself applies, so you know before the ratings roll out.',
    keywords: [
      'codeforces rating predictor',
      'cf rating change calculator',
      'codeforces rating calculator',
      'predict codeforces rating',
      'competitive programming rating',
    ],
    features: [
      'Estimates the rating delta for a given contest and rank',
      'Follows the Elo-derived formula Codeforces uses',
      'Shows the rating you would land on and the band it falls in',
      'Works for any handle without logging in',
    ],
  },

  'cp-profile-comparer': {
    title: 'Competitive Programming Profile Comparer — Codeforces & More',
    description:
      'Compare two competitive programming profiles side by side: ratings, solved counts, problem difficulty spread, contest history and activity over time.',
    keywords: [
      'codeforces profile comparison',
      'compare competitive programmers',
      'cp profile comparer',
      'codeforces stats compare',
      'competitive programming statistics',
    ],
    features: [
      'Two profiles side by side across every headline statistic',
      'Rating history charted on one axis for direct comparison',
      'Breakdown of solved problems by difficulty',
      'Contest participation and activity over time',
    ],
  },
};

/** Keeps a newly added tool from shipping with no SEO at all, using the name and blurb the admin already wrote. */
export const fallbackToolSeo = (tool: {
  name: string;
  description: string;
}): ToolSeo => ({
  title: `${tool.name} — Free Online Tool`,
  description: tool.description,
  keywords: [
    tool.name.toLowerCase(),
    `${tool.name.toLowerCase()} online`,
    'free online tool',
  ],
  features: [],
});
