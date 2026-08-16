import { pdfjsLib } from './pdfjsSetup';
import { escapeXml, packDocx, PAGE_BREAK } from './docxWriter';
import { containsBengali, fixBengaliVisualOrder } from './bengaliText';
import {
  detectOcrLanguage,
  ocrPdfPages,
  type OcrLanguage,
  type OcrProgress,
} from './pdfOcr';

/** One reconstructed visual line of a PDF page. */
interface Line {
  text: string;
  /** Median glyph height, used to tell headings from body text. */
  size: number;
  /** Left edge in points, which drives indent and alignment. */
  x: number;
  /** Right edge, needed to tell centred text from right-aligned. */
  right: number;
  y: number;
  bold: boolean;
  italic: boolean;
  serif: boolean;
  mono: boolean;
  /** Column starts within the row, set when wide gaps split it into cells. */
  cellStarts: number[];
  cells: string[];
}

interface PageLines {
  lines: Line[];
  width: number;
  height: number;
}

interface FontStyle {
  bold: boolean;
  italic: boolean;
  serif: boolean;
  mono: boolean;
}

/** Weight comes from the real font in `commonObjs`, which carries explicit bold/italic flags the generic `styles` map lacks. */
const styleOf = (font: unknown, family: string): FontStyle => {
  const f = (font ?? {}) as {
    name?: string;
    bold?: boolean;
    italic?: boolean;
    black?: boolean;
  };
  const name = (f.name ?? '').toLowerCase();
  const generic = family.toLowerCase();
  return {
    bold:
      f.bold === true ||
      f.black === true ||
      /bold|black|heavy|semibold|demi/.test(name),
    italic: f.italic === true || /italic|oblique/.test(name),
    serif:
      /serif/.test(generic) ||
      /times|georgia|garamond|roman|minion|cambria/.test(name),
    mono: /mono/.test(generic) || /courier|consolas|menlo/.test(name),
  };
};

/** Snaps near-identical sizes together so 10.98 and 11.04 do not become two different sizes in Word. */
const snapSizes = (sizes: number[]): Map<number, number> => {
  const sorted = [...new Set(sizes)].sort((a, b) => a - b);
  const map = new Map<number, number>();
  let bucket: number[] = [];
  const flush = (): void => {
    if (!bucket.length) return;
    const target =
      Math.round((bucket.reduce((s, v) => s + v, 0) / bucket.length) * 2) / 2;
    for (const value of bucket) map.set(value, target);
    bucket = [];
  };
  for (const value of sorted) {
    if (bucket.length && value - (bucket[0] as number) > 0.75) flush();
    bucket.push(value);
  }
  flush();
  return map;
};

/** Rebuilds rows from glyph geometry, since PDF streams carry positioned glyphs rather than lines. */
async function extractLines(file: File): Promise<PageLines[]> {
  const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() })
    .promise;
  const pages: PageLines[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    // Building the operator list is what populates commonObjs with real fonts.
    await page.getOperatorList();
    const content = await page.getTextContent();
    const styles = content.styles as Record<string, { fontFamily?: string }>;
    const styleCache = new Map<string, FontStyle>();
    const resolveStyle = (fontName: string): FontStyle => {
      let cached = styleCache.get(fontName);
      if (!cached) {
        let real: unknown = null;
        try {
          real = page.commonObjs.get(fontName);
        } catch {
          real = null;
        }
        cached = styleOf(real, styles[fontName]?.fontFamily ?? '');
        styleCache.set(fontName, cached);
      }
      return cached;
    };
    const rows = new Map<
      number,
      Array<{
        x: number;
        w: number;
        y: number;
        str: string;
        h: number;
        fontName: string;
      }>
    >();

    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const x = item.transform[4] as number;
      const y = item.transform[5] as number;
      const h =
        Math.abs(item.height) || Math.abs(item.transform[3] as number) || 10;
      const fontName = String(item.fontName ?? '');
      // Rounding the baseline is what groups glyphs into a shared row.
      const key = Math.round(y / Math.max(2, h * 0.5));
      const entry = { x, w: item.width || 0, y, str: item.str, h, fontName };
      const row = rows.get(key);
      if (row) row.push(entry);
      else rows.set(key, [entry]);
    }

    const lines: Line[] = [...rows.values()]
      .map((items) => {
        items.sort((a, b) => a.x - b.x);
        const mid = items[Math.floor(items.length / 2)];
        const size = mid?.h ?? 10;
        const style = resolveStyle(mid?.fontName ?? '');
        let text = '';
        let prevEnd: number | null = null;
        const cellStarts: number[] = [];
        const cells: string[] = [];
        let cell = '';
        for (const item of items) {
          // A gap several times the type size is a column boundary, not a word space.
          if (prevEnd !== null && item.x - prevEnd > size * 2.5) {
            cells.push(cell.trim());
            cell = '';
            cellStarts.push(item.x);
            if (!text.endsWith(' ')) text += '  ';
          } else if (
            prevEnd !== null &&
            item.x - prevEnd > size * 0.22 &&
            !text.endsWith(' ')
          ) {
            text += ' ';
            cell += ' ';
          }
          if (cellStarts.length === 0) cellStarts.push(item.x);
          text += item.str;
          cell += item.str;
          prevEnd = item.x + item.w;
        }
        const last = items[items.length - 1];
        return {
          // Painted order in, typed order out.
          text: fixBengaliVisualOrder(text.replace(/\s+/g, ' ').trim()),
          size,
          x: items[0]?.x ?? 0,
          right: last ? last.x + last.w : 0,
          // The true baseline: the grouping key is scaled per font height and cannot order mixed sizes.
          y: mid?.y ?? 0,
          cellStarts,
          cells: [...cells, cell.trim()],
          ...style,
        };
      })
      .filter((line) => line.text.length > 0)
      // PDF y grows upward, so descending y is top-to-bottom reading order.
      .sort((a, b) => b.y - a.y);

    pages.push({ lines, width: viewport.width, height: viewport.height });
  }
  return pages;
}

type Align = 'left' | 'center' | 'right';

interface Block {
  text: string;
  size: number;
  bold: boolean;
  italic: boolean;
  serif: boolean;
  mono: boolean;
  align: Align;
  indent: number;
  bullet: boolean;
  heading: boolean;
}

const BULLET = /^([•·▪◦●○‣*]|-\s|–\s|\d{1,2}[.)]\s|[a-z][.)]\s)\s*/i;

const alignOf = (line: Line, pageWidth: number, bodyLeft: number): Align => {
  const leftGap = line.x - bodyLeft;
  const rightGap = pageWidth - line.right;
  const width = line.right - line.x;
  // Centred lines sit inside both margins by a similar amount and never fill the column.
  if (
    leftGap > pageWidth * 0.12 &&
    Math.abs(leftGap - (rightGap - bodyLeft)) < pageWidth * 0.06 &&
    width < pageWidth * 0.8
  )
    return 'center';
  if (leftGap > pageWidth * 0.25 && rightGap < pageWidth * 0.12) return 'right';
  return 'left';
};

/** Joins rows that continue a sentence at the same indent, so the .docx reflows as paragraphs. */
function toBlocks(page: PageLines, bodySize: number): Block[] {
  // Reduced, not spread: a dense page can hold thousands of lines and blow the call stack.
  const bodyLeft = page.lines.reduce(
    (min, line) => Math.min(min, line.x),
    page.width
  );
  const blocks: Block[] = [];

  for (const line of page.lines) {
    const bulletMatch = BULLET.exec(line.text);
    const text = bulletMatch
      ? line.text.slice(bulletMatch[0].length)
      : line.text;
    const heading =
      line.size > bodySize * 1.18 ||
      (line.bold && line.size >= bodySize && text.length < 80);
    const block: Block = {
      text,
      size: line.size,
      bold: line.bold,
      italic: line.italic,
      serif: line.serif,
      mono: line.mono,
      align: alignOf(line, page.width, bodyLeft),
      indent: Math.max(0, Math.round(((line.x - bodyLeft) / 72) * 1440)),
      bullet: Boolean(bulletMatch),
      heading,
    };

    const prev = blocks[blocks.length - 1];
    const continues =
      prev &&
      !block.bullet &&
      !prev.bullet &&
      !prev.heading &&
      !block.heading &&
      prev.align === block.align &&
      Math.abs(prev.size - block.size) < 0.6 &&
      Math.abs(prev.indent - block.indent) < 60 &&
      !/[.!?:;•]$/.test(prev.text) &&
      /^[a-z(,"'‘“]/.test(block.text);

    if (continues && prev) prev.text = `${prev.text} ${block.text}`;
    else blocks.push(block);
  }
  return blocks;
}

/** Word falls back badly for Bengali unless the run names a face that has the glyphs. */
const BENGALI_FONT = 'Nirmala UI';

const runProps = (b: Block): string => {
  const halfPoints = Math.round(Math.min(72, Math.max(6, b.size)) * 2);
  const bengali = containsBengali(b.text);
  const family = bengali
    ? BENGALI_FONT
    : b.mono
      ? 'Consolas'
      : b.serif
        ? 'Times New Roman'
        : 'Calibri';
  // szCs/bCs are the complex-script twins; without them Word ignores size and weight on Bengali.
  return `<w:rPr><w:rFonts w:ascii="${family}" w:hAnsi="${family}" w:cs="${family}"/>${
    b.bold || b.heading ? '<w:b/><w:bCs/>' : ''
  }${b.italic ? '<w:i/><w:iCs/>' : ''}<w:sz w:val="${halfPoints}"/><w:szCs w:val="${halfPoints}"/>${
    bengali ? '<w:lang w:bidi="bn-BD"/>' : ''
  }</w:rPr>`;
};

const paragraph = (b: Block): string => {
  const jc = b.align === 'left' ? '' : `<w:jc w:val="${b.align}"/>`;
  const ind = b.bullet
    ? `<w:ind w:left="${b.indent + 360}" w:hanging="360"/>`
    : b.indent > 40
      ? `<w:ind w:left="${b.indent}"/>`
      : '';
  const spacing = b.heading
    ? '<w:spacing w:before="240" w:after="80"/>'
    : '<w:spacing w:after="80" w:line="276" w:lineRule="auto"/>';
  const style = b.heading ? '<w:pStyle w:val="Heading2"/>' : '';
  const numbering = b.bullet
    ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>'
    : '';
  return `<w:p><w:pPr>${style}${numbering}${jc}${ind}${spacing}</w:pPr><w:r>${runProps(b)}<w:t xml:space="preserve">${escapeXml(b.text)}</w:t></w:r></w:p>`;
};

export interface DocxResult {
  bytes: Uint8Array;
  /** How many pages had to be read with OCR. */
  ocrPages: number;
  /** Lines of real text recovered; zero means the PDF is a scan with no text layer. */
  lineCount: number;
  pageCount: number;
}

/** Rebuilds the PDF's text as real OOXML so every word stays editable; layout is reflowed, not replicated. */
export interface DocxOptions {
  title?: string;
  /** Reads pages with no text layer via OCR; the language is inferred unless forced. */
  ocr?: {
    language?: OcrLanguage | 'auto';
    onProgress?: (progress: OcrProgress) => void;
  };
}

/** Below this a page is treated as a scan: a stray header is not a text layer. */
const SCANNED_PAGE_THRESHOLD = 3;

export async function pdfToDocx(
  file: File,
  options: DocxOptions = {}
): Promise<DocxResult> {
  const { title = 'Converted document' } = options;
  const pages = await extractLines(file);

  let ocrPageCount = 0;
  if (options.ocr) {
    const scanned = pages
      .map((page, index) => ({ page, index }))
      .filter(({ page }) => page.lines.length < SCANNED_PAGE_THRESHOLD)
      .map(({ index }) => index);

    if (scanned.length) {
      const requested = options.ocr.language ?? 'auto';
      const language =
        requested === 'auto'
          ? detectOcrLanguage(
              pages
                .flatMap((page) => page.lines.map((line) => line.text))
                .join(' ')
                .slice(0, 4000)
            )
          : requested;
      const recognised = await ocrPdfPages(
        file,
        scanned.map((index) => index + 1),
        language,
        options.ocr.onProgress
      );
      for (const [pageNumber, lines] of recognised) {
        const target = pages[pageNumber - 1];
        if (!target || lines.length === 0) continue;
        ocrPageCount += 1;
        target.lines = lines
          .map((line) => ({
            ...line,
            bold: false,
            italic: false,
            serif: false,
            mono: false,
            cellStarts: [line.x],
            cells: [line.text],
          }))
          .sort((a, b) => b.y - a.y);
      }
    }
  }
  const rawSizes = pages.flatMap((page) => page.lines.map((line) => line.size));
  // Snapped first so body size and heading detection share one scale.
  const snapped = snapSizes(rawSizes);
  for (const page of pages)
    for (const line of page.lines)
      line.size = snapped.get(line.size) ?? line.size;

  const allSizes = [...rawSizes]
    .map((s) => snapped.get(s) ?? s)
    .sort((a, b) => a - b);
  const bodySize = allSizes[Math.floor(allSizes.length / 2)] ?? 11;
  const lineCount = allSizes.length;

  const body = pages
    .map((page) => renderPageBody(page, bodySize))
    .join(PAGE_BREAK);

  // The source page geometry is carried over so the .docx opens at the same size.
  const first = pages[0];

  return {
    bytes: await packDocx(body, {
      title,
      pageWidth: first?.width,
      pageHeight: first?.height,
    }),
    ocrPages: ocrPageCount,
    lineCount,
    pageCount: pages.length,
  };
}

/** Rows group by baseline, so side-by-side columns arrive fused; matching cell starts are lifted out as separate columns. */
function splitColumns(lines: Line[], pageWidth: number): Line[][] {
  if (lines.length < 4) return [lines];

  const multi = lines.filter((line) => line.cellStarts.length === 2);
  if (multi.length < 3 || multi.length < lines.length * 0.6) return [lines];

  const secondStarts = multi.map((line) => line.cellStarts[1] as number);
  const median = [...secondStarts].sort((a, b) => a - b)[
    Math.floor(secondStarts.length / 2)
  ] as number;
  // A real column has a stable start; drifting values are just wide word gaps.
  if (secondStarts.some((x) => Math.abs(x - median) > pageWidth * 0.05))
    return [lines];

  const asLine = (line: Line, index: number): Line => ({
    ...line,
    text: line.cells[index] ?? '',
    x: line.cellStarts[index] ?? line.x,
    right: index === 0 ? median - 4 : line.right,
    cellStarts: [line.cellStarts[index] ?? line.x],
    cells: [line.cells[index] ?? ''],
  });

  const columns = [0, 1].map((index) =>
    lines
      .map((line) =>
        line.cellStarts.length === 2 ? asLine(line, index) : line
      )
      // A full-width row belongs to the first column only, or it would repeat.
      .filter((_line, i) => lines[i]?.cellStarts.length === 2 || index === 0)
      .filter((line) => line.text.trim().length > 0)
  );

  return columns[1]?.length ? columns : [lines];
}

interface TableRow {
  cells: string[];
  y: number;
}

/** Rows that share the same column starts are a table, not paragraphs that happen to line up. */
function detectTables(
  lines: Array<Line & { cellStarts?: number[] }>
): Array<{ start: number; end: number; columns: number[] }> {
  const tables: Array<{ start: number; end: number; columns: number[] }> = [];
  let runStart = -1;
  let columns: number[] = [];

  /** Table cells are short values; long text side by side is a column layout, not a table. */
  const isTabular = (line: Line): boolean => {
    const cells = line.cells.filter(Boolean);
    if (cells.length < 2) return false;
    if (cells.some((c) => c.length > 40)) return false;
    return cells.length >= 3 || cells.every((c) => c.length <= 18);
  };

  const columnsOf = (line: Line): number[] =>
    isTabular(line) ? (line.cellStarts ?? []) : [];
  const similar = (a: number[], b: number[]): boolean =>
    a.length > 1 &&
    a.length === b.length &&
    a.every((v, i) => Math.abs(v - (b[i] as number)) < 12);

  for (let i = 0; i < lines.length; i++) {
    const current = columnsOf(lines[i] as Line);
    if (runStart < 0) {
      if (current.length > 1) {
        runStart = i;
        columns = current;
      }
      continue;
    }
    if (similar(columns, current)) continue;
    if (i - runStart >= 2)
      tables.push({ start: runStart, end: i - 1, columns });
    runStart = current.length > 1 ? i : -1;
    columns = current;
  }
  if (runStart >= 0 && lines.length - runStart >= 2)
    tables.push({ start: runStart, end: lines.length - 1, columns });
  return tables;
}

const tableXml = (rows: TableRow[], columnCount: number): string => {
  const width = Math.floor(9360 / Math.max(1, columnCount));
  const body = rows
    .map(
      (row) =>
        `<w:tr>${Array.from({ length: columnCount }, (_, i) => {
          const cell = row.cells[i] ?? '';
          return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${escapeXml(cell)}</w:t></w:r></w:p></w:tc>`;
        }).join('')}</w:tr>`
    )
    .join('');
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="999999"/><w:left w:val="single" w:sz="4" w:color="999999"/><w:bottom w:val="single" w:sz="4" w:color="999999"/><w:right w:val="single" w:sz="4" w:color="999999"/><w:insideH w:val="single" w:sz="4" w:color="999999"/><w:insideV w:val="single" w:sz="4" w:color="999999"/></w:tblBorders></w:tblPr>${body}</w:tbl>`;
};

/** Renders one column's lines, splicing detected tables in at their original position. */
function renderLines(lines: Line[], page: PageLines, bodySize: number): string {
  const tables = detectTables(lines);
  const out: string[] = [];
  let cursor = 0;

  // Columns resolve per plain segment, so a full-width table cannot hide the gutter below it.
  const prose = (slice: Line[]): string =>
    splitColumns(slice, page.width)
      .map((column) =>
        toBlocks({ ...page, lines: column }, bodySize)
          .map(paragraph)
          .join('')
      )
      .join('');

  for (const table of tables) {
    if (table.start > cursor) out.push(prose(lines.slice(cursor, table.start)));
    const rows = lines
      .slice(table.start, table.end + 1)
      .map((line) => ({ cells: line.cells, y: line.y }));
    out.push(tableXml(rows, table.columns.length));
    cursor = table.end + 1;
  }

  if (cursor < lines.length) out.push(prose(lines.slice(cursor)));
  return out.join('');
}

/** Page body: tables kept in place, prose around them read column by column. */
export function renderPageBody(page: PageLines, bodySize: number): string {
  return renderLines(page.lines, page, bodySize);
}
