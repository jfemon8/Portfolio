// Everything here runs on the text an ATS parser would actually see — extracted directly from the file the visitor uploads, never invented or scored by a model. PDF text comes with real per-item position data (used for layout-hazard detection below); DOCX text comes from mammoth's raw-text conversion.
import { pdfjsLib } from './pdfjsSetup';

export interface TextPosition {
  text: string;
  x: number;
  y: number;
  pageNumber: number;
}

export interface ParsedResume {
  fullText: string;
  pageCount: number;
  positions: TextPosition[];
}

async function extractPdf(arrayBuffer: ArrayBuffer): Promise<ParsedResume> {
  const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const positions: TextPosition[] = [];
  const pageTexts: string[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    let pageText = '';
    for (const item of content.items) {
      if (!('str' in item) || !item.str) continue;
      positions.push({
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
        pageNumber,
      });
      pageText += item.str + (item.hasEOL ? '\n' : '');
    }
    pageTexts.push(pageText);
  }
  return {
    fullText: pageTexts.join('\n\n'),
    pageCount: doc.numPages,
    positions,
  };
}

async function extractDocx(arrayBuffer: ArrayBuffer): Promise<ParsedResume> {
  const mammoth = (await import('mammoth')).default;
  const result = await mammoth.extractRawText({ arrayBuffer });
  // DOCX has no per-item position data the way a PDF content stream does, so layout-hazard detection below simply has nothing to flag for this format — not a gap in coverage, just a different (position-free) document model.
  return { fullText: result.value, pageCount: 1, positions: [] };
}

export async function parseResume(file: File): Promise<ParsedResume> {
  const buffer = await file.arrayBuffer();
  if (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  ) {
    return extractPdf(buffer);
  }
  return extractDocx(buffer);
}

// A large horizontal gap roughly in the middle of a page's text extent is the signature of a multi-column layout — PDF.js extracts text in content-stream order, which for many multi-column PDFs does not read left-column-then-right-column the way a human (or an ATS) would expect, silently scrambling the reading order.
function pageHasMultiColumnLayout(positions: TextPosition[]): boolean {
  const xs = positions.map((p) => p.x).sort((a, b) => a - b);
  if (xs.length < 20) return false;
  const minX = xs[0]!;
  const maxX = xs[xs.length - 1]!;
  const range = maxX - minX;
  if (range < 100) return false;
  const gapThreshold = range * 0.12;
  for (let i = 1; i < xs.length; i++) {
    const gap = xs[i]! - xs[i - 1]!;
    const positionInRange = (xs[i - 1]! - minX) / range;
    if (
      gap > gapThreshold &&
      positionInRange > 0.25 &&
      positionInRange < 0.75
    ) {
      return true;
    }
  }
  return false;
}

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_PATTERN =
  /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/;
const SECTION_HEADING_PATTERN =
  /\b(experience|employment|work history|education|skills|projects|certifications|summary)\b/i;

export interface AtsHazard {
  severity: 'high' | 'medium';
  message: string;
}

export function detectHazards(resume: ParsedResume): AtsHazard[] {
  const hazards: AtsHazard[] = [];
  const trimmed = resume.fullText.trim();

  const pagesWithMultiColumn = new Set(
    resume.positions
      .reduce<number[]>((pages, p) => {
        if (!pages.includes(p.pageNumber)) pages.push(p.pageNumber);
        return pages;
      }, [])
      .filter((pageNumber) =>
        pageHasMultiColumnLayout(
          resume.positions.filter((p) => p.pageNumber === pageNumber)
        )
      )
  );
  if (pagesWithMultiColumn.size > 0) {
    hazards.push({
      severity: 'high',
      message: `Multi-column layout detected on page${pagesWithMultiColumn.size > 1 ? 's' : ''} ${[...pagesWithMultiColumn].join(', ')} — many ATS parsers read straight across the page, silently interleaving your two columns into scrambled, nonsensical text.`,
    });
  }

  const charsPerPage = trimmed.length / Math.max(resume.pageCount, 1);
  if (charsPerPage < 200) {
    hazards.push({
      severity: 'high',
      message:
        'Very little text could be extracted for the document length — content may be trapped in images, text boxes, or graphics that a real ATS parser cannot read at all.',
    });
  }

  if (!EMAIL_PATTERN.test(trimmed)) {
    hazards.push({
      severity: 'high',
      message:
        "No email address was found in the extracted text — if it's in a header/footer or a text box, many ATS parsers will miss it entirely.",
    });
  }
  if (!PHONE_PATTERN.test(trimmed)) {
    hazards.push({
      severity: 'medium',
      message: 'No phone number was found in the extracted text.',
    });
  }
  if (!SECTION_HEADING_PATTERN.test(trimmed)) {
    hazards.push({
      severity: 'medium',
      message:
        'No standard section heading (Experience, Education, Skills, etc.) was found — if your headings are stylized as images or unusual fonts, an ATS may not recognize them as section breaks.',
    });
  }

  return hazards;
}

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'your',
  'you',
  'are',
  'will',
  'have',
  'has',
  'our',
  'their',
  'able',
  'must',
  'not',
  'all',
  'any',
  'can',
  'who',
  'what',
  'when',
  'where',
  'why',
  'how',
  'job',
  'role',
  'work',
  'team',
  'company',
  'about',
  'into',
  'other',
  'more',
  'such',
  'than',
  'per',
]);

function extractKeywords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return new Set(words);
}

export interface KeywordOverlap {
  matched: string[];
  missing: string[];
}

export function compareKeywords(
  resumeText: string,
  jobDescription: string
): KeywordOverlap {
  const resumeWords = extractKeywords(resumeText);
  const jdWords = [...extractKeywords(jobDescription)].sort();
  const matched: string[] = [];
  const missing: string[] = [];
  for (const word of jdWords) {
    (resumeWords.has(word) ? matched : missing).push(word);
  }
  return { matched, missing };
}
