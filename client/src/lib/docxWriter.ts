/** Minimal OOXML packaging shared by every .docx export. */

export const escapeXml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
    // Control characters are illegal in XML and Word rejects the whole file over one.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

export const twips = (points: number): number =>
  Math.round((points / 72) * 1440);

export const PAGE_BREAK = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="999999"/><w:left w:val="single" w:sz="4" w:color="999999"/><w:bottom w:val="single" w:sz="4" w:color="999999"/><w:right w:val="single" w:sz="4" w:color="999999"/><w:insideH w:val="single" w:sz="4" w:color="999999"/><w:insideV w:val="single" w:sz="4" w:color="999999"/></w:tblBorders></w:tblPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/></w:rPr></w:style>
</w:styles>`;

const NUMBERING = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="&#8226;"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol"/></w:rPr></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;

const coreProps = (
  title: string
): string => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:title>${escapeXml(title)}</dc:title>
</cp:coreProperties>`;

export interface DocxPackOptions {
  title: string;
  /** Page box in points; defaults to A4. */
  pageWidth?: number;
  pageHeight?: number;
}

/** Wraps ready-made `<w:p>` markup into a complete, openable .docx. */
export async function packDocx(
  bodyXml: string,
  options: DocxPackOptions
): Promise<Uint8Array> {
  const width = twips(options.pageWidth ?? 595);
  const height = twips(options.pageHeight ?? 842);
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${
    bodyXml ||
    '<w:p><w:r><w:t xml:space="preserve">This document is empty.</w:t></w:r></w:p>'
  }<w:sectPr><w:pgSz w:w="${width}" w:h="${height}"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES);
  zip.file('_rels/.rels', ROOT_RELS);
  zip.file('docProps/core.xml', coreProps(options.title));
  zip.file('word/_rels/document.xml.rels', DOC_RELS);
  zip.file('word/styles.xml', STYLES);
  zip.file('word/numbering.xml', NUMBERING);
  zip.file('word/document.xml', document);
  return zip.generateAsync({ type: 'uint8array' });
}

/** Bengali needs a face that actually has the glyphs, or Word substitutes badly. */
const BENGALI_FONT = 'Nirmala UI';
const hasBengali = (value: string): boolean => /[ঀ-৿]/.test(value);

/** Turns plain text into paragraphs, keeping blank lines as separators. */
export async function textToDocx(
  text: string,
  title: string
): Promise<Uint8Array> {
  const body = text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      const font = hasBengali(trimmed) ? BENGALI_FONT : 'Calibri';
      if (!trimmed) return '<w:p/>';
      return `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${escapeXml(trimmed)}</w:t></w:r></w:p>`;
    })
    .join('');
  return packDocx(body, { title });
}

/** A recognised or extracted line, with the geometry alignment is derived from. */
export interface LayoutLine {
  text: string;
  x: number;
  right: number;
  y: number;
  size: number;
}

export type LayoutAlign = 'left' | 'center' | 'right';

interface LayoutBlock {
  text: string;
  align: LayoutAlign;
  indentChars: number;
  gapBefore: boolean;
}

/** OCR reports each table cell as its own line, so cells sharing a row are stitched back into one before anything is measured. */
function groupRows(lines: LayoutLine[]): LayoutLine[] {
  if (lines.length < 2) return lines;
  const ordered = [...lines].sort((a, b) => a.y - b.y || a.x - b.x);
  const heightOf = (line: LayoutLine): number => Math.max(1, line.size * 1.28);
  const median =
    [...ordered].map((l) => l.size).sort((a, b) => a - b)[
      Math.floor(ordered.length / 2)
    ] ?? 12;

  const rows: LayoutLine[][] = [];
  for (const line of ordered) {
    const row = rows[rows.length - 1];
    const last = row?.[row.length - 1];
    // Same row when the two boxes overlap vertically by more than half the shorter one.
    if (
      last &&
      Math.abs(line.y - last.y) < Math.min(heightOf(line), heightOf(last)) * 0.5
    )
      row.push(line);
    else rows.push([line]);
  }

  return rows.map((row) => {
    if (row.length === 1) return row[0] as LayoutLine;
    const cells = [...row].sort((a, b) => a.x - b.x);
    const charWidth = Math.max(1, median * 0.55);
    let text = '';
    let cursor = (cells[0] as LayoutLine).x;
    for (const cell of cells) {
      // Cells are separated by the gap that was actually between them, so columns stay lined up.
      const gap = Math.round((cell.x - cursor) / charWidth);
      if (text) text += ' '.repeat(Math.max(2, gap));
      text += cell.text;
      cursor = cell.right;
    }
    return {
      text,
      x: (cells[0] as LayoutLine).x,
      right: cells.reduce((max, c) => Math.max(max, c.right), 0),
      y: row.reduce((min, c) => Math.min(min, c.y), Infinity),
      size: median,
    };
  });
}

/** Reads the alignment a line was laid out with, measured against the text block's own margins. */
function analyseLayout(input: LayoutLine[], width: number): LayoutBlock[] {
  const lines = groupRows(input);
  if (!lines.length) return [];
  const bodyLeft = lines.reduce((min, l) => Math.min(min, l.x), width);
  const bodyRight = lines.reduce((max, l) => Math.max(max, l.right), 0);
  const span = Math.max(1, bodyRight - bodyLeft);
  const median =
    [...lines].map((l) => l.size).sort((a, b) => a - b)[
      Math.floor(lines.length / 2)
    ] ?? 12;

  return lines.map((line, i) => {
    const leftGap = line.x - bodyLeft;
    const rightGap = bodyRight - line.right;
    const lineWidth = line.right - line.x;
    let align: LayoutAlign = 'left';
    // Centred text leaves a similar margin on both sides without filling the column.
    if (
      lineWidth < span * 0.85 &&
      Math.abs(leftGap - rightGap) < span * 0.08 &&
      leftGap > span * 0.06
    )
      align = 'center';
    else if (leftGap > span * 0.2 && rightGap < span * 0.05) align = 'right';

    const previous = lines[i - 1];
    return {
      text: line.text,
      align,
      // Indentation is expressed in characters so plain text can show it too.
      indentChars: align === 'left' ? Math.round(leftGap / (median * 0.55)) : 0,
      gapBefore: Boolean(previous && line.y - previous.y > median * 2.1),
    };
  });
}

/** Plain-text rendering that keeps centring and indents using spaces. */
export function layoutToText(lines: LayoutLine[], width: number): string {
  const blocks = analyseLayout(lines, width);
  const columns = 78;
  return blocks
    .map((block) => {
      const prefix = block.gapBefore ? '\n' : '';
      if (block.align === 'center')
        return (
          prefix +
          ' '.repeat(
            Math.max(0, Math.floor((columns - block.text.length) / 2))
          ) +
          block.text
        );
      if (block.align === 'right')
        return (
          prefix +
          ' '.repeat(Math.max(0, columns - block.text.length)) +
          block.text
        );
      return prefix + ' '.repeat(Math.max(0, block.indentChars)) + block.text;
    })
    .join('\n');
}

/** Same layout, but as real Word paragraphs with genuine alignment and indents. */
export async function layoutToDocx(
  lines: LayoutLine[],
  width: number,
  title: string
): Promise<Uint8Array> {
  const body = analyseLayout(lines, width)
    .map((block) => {
      const font = /[ঀ-৿]/.test(block.text) ? 'Nirmala UI' : 'Calibri';
      const jc = block.align === 'left' ? '' : `<w:jc w:val="${block.align}"/>`;
      const indent =
        block.indentChars > 1
          ? `<w:ind w:left="${block.indentChars * 110}"/>`
          : '';
      const spacing = `<w:spacing w:after="${block.gapBefore ? 160 : 60}"/>`;
      return `<w:p><w:pPr>${jc}${indent}${spacing}</w:pPr><w:r><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${escapeXml(block.text)}</w:t></w:r></w:p>`;
    })
    .join('');
  return packDocx(body, { title });
}
