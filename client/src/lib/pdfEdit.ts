import {
  StandardFonts,
  degrees,
  rgb,
  type PDFDocument,
  type PDFFont,
  type PDFImage,
} from 'pdf-lib';
import { loadPdf } from './pdfTools';

/** Served from /public, so the 164 KB face is fetched only when non-Latin text is actually used. */
const UNICODE_FONT_URL = '/fonts/NotoSansBengali-Regular.ttf';
let unicodeFontBytes: Promise<ArrayBuffer> | null = null;

/** Embeds a Unicode face for scripts the standard fonts cannot encode; fontkit’s Indic shaper needs the regenerator global loaded first. */
async function embedUnicodeFont(doc: PDFDocument): Promise<PDFFont> {
  const [{ default: fontkit }] = await Promise.all([
    import('@pdf-lib/fontkit'),
    import('regenerator-runtime/runtime.js'),
  ]);
  unicodeFontBytes ??= fetch(UNICODE_FONT_URL).then((res) => {
    if (!res.ok) throw new Error(`Font request failed (${res.status})`);
    return res.arrayBuffer();
  });
  doc.registerFontkit(fontkit);
  return doc.embedFont(await unicodeFontBytes, { subset: true });
}

export interface PageSize {
  width: number;
  height: number;
}

export async function readPageSizes(file: File): Promise<PageSize[]> {
  const doc = await loadPdf(await file.arrayBuffer());
  return doc
    .getPages()
    .map((page) => ({ width: page.getWidth(), height: page.getHeight() }));
}

export const EDIT_FONTS = {
  helvetica: StandardFonts.Helvetica,
  'helvetica-bold': StandardFonts.HelveticaBold,
  'helvetica-italic': StandardFonts.HelveticaOblique,
  times: StandardFonts.TimesRoman,
  'times-bold': StandardFonts.TimesRomanBold,
  'times-italic': StandardFonts.TimesRomanItalic,
  courier: StandardFonts.Courier,
  'courier-bold': StandardFonts.CourierBold,
} as const;

export type EditFontKey = keyof typeof EDIT_FONTS;

export const FONT_CHOICES: Array<{ key: EditFontKey; label: string }> = [
  { key: 'helvetica', label: 'Helvetica' },
  { key: 'helvetica-bold', label: 'Helvetica Bold' },
  { key: 'helvetica-italic', label: 'Helvetica Italic' },
  { key: 'times', label: 'Times' },
  { key: 'times-bold', label: 'Times Bold' },
  { key: 'times-italic', label: 'Times Italic' },
  { key: 'courier', label: 'Courier' },
  { key: 'courier-bold', label: 'Courier Bold' },
];

/** CSS stacks matching each base font, so the on-screen preview lines up with the export. */
export const EDIT_FONT_CSS: Record<EditFontKey, string> = {
  helvetica: 'Helvetica, Arial, sans-serif',
  'helvetica-bold': 'Helvetica, Arial, sans-serif',
  'helvetica-italic': 'Helvetica, Arial, sans-serif',
  times: "'Times New Roman', Times, serif",
  'times-bold': "'Times New Roman', Times, serif",
  'times-italic': "'Times New Roman', Times, serif",
  courier: "'Courier New', Courier, monospace",
  'courier-bold': "'Courier New', Courier, monospace",
};

export const isBoldFont = (key: EditFontKey): boolean => key.endsWith('-bold');
export const isItalicFont = (key: EditFontKey): boolean =>
  key.endsWith('-italic');

/** The standard PDF fonts only encode WinAnsi; anything else routes to the embedded Unicode face. */
const WIN_ANSI_SAFE = /^[\x20-\x7E\xA0-\xFF‘’“”–—•…€™\n\t]*$/;

export const needsUnicodeFont = (value: string): boolean =>
  !WIN_ANSI_SAFE.test(value);

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const value = Number.parseInt(full, 16);
  return Number.isNaN(value)
    ? { r: 0, g: 0, b: 0 }
    : {
        r: ((value >> 16) & 255) / 255,
        g: ((value >> 8) & 255) / 255,
        b: (value & 255) / 255,
      };
};

const asColor = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return rgb(r, g, b);
};

export interface TextElement {
  kind: 'text';
  id: string;
  pageIndex: number;
  xPct: number;
  yPct: number;
  text: string;
  fontKey: EditFontKey;
  /** Points — the PDF's own unit, so the size survives export unchanged. */
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number;
}

export interface ImageElement {
  kind: 'image';
  id: string;
  pageIndex: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  /** height / width of the source bitmap. */
  aspect: number;
  dataUrl: string;
  opacity: number;
}

/** A filled rectangle that hides what sits under it; the covered text is still in the file. */
export interface CoverElement {
  kind: 'cover';
  id: string;
  pageIndex: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  color: string;
}

export type EditElement = TextElement | ImageElement | CoverElement;

export type BandAlign = 'left' | 'center' | 'right';

export interface BandOptions {
  enabled: boolean;
  text: string;
  align: BandAlign;
  fontKey: EditFontKey;
  fontSize: number;
  color: string;
  margin: number;
  skipFirstPage: boolean;
}

export interface PageNumberOptions {
  enabled: boolean;
  /** `{n}` and `{total}` are substituted per page. */
  format: string;
  align: BandAlign;
  position: 'top' | 'bottom';
  fontKey: EditFontKey;
  fontSize: number;
  color: string;
  margin: number;
  startAt: number;
  skipFirstPage: boolean;
}

export interface WatermarkOptions {
  enabled: boolean;
  mode: 'text' | 'image';
  text: string;
  fontKey: EditFontKey;
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number;
  /** Image mode: the stamp itself, plus its width as a share of the page. */
  dataUrl: string;
  aspect: number;
  widthPct: number;
}

export interface PdfEditOptions {
  elements: EditElement[];
  header: BandOptions;
  footer: BandOptions;
  pageNumbers: PageNumberOptions;
  watermark: WatermarkOptions;
  metadata: { title: string; author: string; subject: string };
}

const alignedX = (
  align: BandAlign,
  pageWidth: number,
  textWidth: number,
  margin: number
): number => {
  if (align === 'left') return margin;
  if (align === 'right') return pageWidth - margin - textWidth;
  return (pageWidth - textWidth) / 2;
};

/** Every piece of text that will be encoded, so the UI can block an unsupported script before export. */
export function collectEditText(options: PdfEditOptions): string {
  return [
    ...options.elements.flatMap((el) => (el.kind === 'text' ? [el.text] : [])),
    options.header.enabled ? options.header.text : '',
    options.footer.enabled ? options.footer.text : '',
    options.pageNumbers.enabled ? options.pageNumbers.format : '',
    options.watermark.enabled && options.watermark.mode === 'text'
      ? options.watermark.text
      : '',
  ].join('');
}

/** Applies placed elements first, then the repeating bands, then metadata — one pass, one save. */
export async function applyPdfEdits(
  file: File,
  options: PdfEditOptions
): Promise<Uint8Array> {
  const doc = await loadPdf(await file.arrayBuffer());
  const pages = doc.getPages();
  const fonts = new Map<EditFontKey, PDFFont>();
  const images = new Map<string, PDFImage>();

  let unicodeFont: PDFFont | null = null;

  // WinAnsi keeps the light standard font; anything else pulls in the embedded Unicode face.
  const fontOf = async (key: EditFontKey, text = ''): Promise<PDFFont> => {
    if (needsUnicodeFont(text)) {
      unicodeFont ??= await embedUnicodeFont(doc);
      return unicodeFont;
    }
    let font = fonts.get(key);
    if (!font) {
      font = await doc.embedFont(EDIT_FONTS[key]);
      fonts.set(key, font);
    }
    return font;
  };

  for (const element of options.elements) {
    const page = pages[element.pageIndex];
    if (!page) continue;
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    // UI coordinates are top-left origin; PDF coordinates are bottom-left origin.
    const x = element.xPct * pageWidth;
    const topY = element.yPct * pageHeight;

    if (element.kind === 'text') {
      if (!element.text.trim()) continue;
      const font = await fontOf(element.fontKey, element.text);
      const lineHeight = element.fontSize * 1.2;
      element.text.split('\n').forEach((line, index) => {
        page.drawText(line, {
          x,
          y: pageHeight - topY - element.fontSize - index * lineHeight,
          size: element.fontSize,
          font,
          color: asColor(element.color),
          opacity: element.opacity,
          rotate: degrees(element.rotation),
        });
      });
      continue;
    }

    if (element.kind === 'cover') {
      page.drawRectangle({
        x,
        y: pageHeight - topY - element.heightPct * pageHeight,
        width: element.widthPct * pageWidth,
        height: element.heightPct * pageHeight,
        color: asColor(element.color),
      });
      continue;
    }

    let image = images.get(element.dataUrl);
    if (!image) {
      image = element.dataUrl.startsWith('data:image/jpeg')
        ? await doc.embedJpg(element.dataUrl)
        : await doc.embedPng(element.dataUrl);
      images.set(element.dataUrl, image);
    }
    const width = element.widthPct * pageWidth;
    const height = width * element.aspect;
    page.drawImage(image, {
      x,
      y: pageHeight - topY - height,
      width,
      height,
      opacity: element.opacity,
    });
  }

  const bands: Array<[BandOptions, 'top' | 'bottom']> = [
    [options.header, 'top'],
    [options.footer, 'bottom'],
  ];

  for (const [band, position] of bands) {
    if (!band.enabled || !band.text.trim()) continue;
    const font = await fontOf(band.fontKey, band.text);
    pages.forEach((page, index) => {
      if (band.skipFirstPage && index === 0) return;
      const width = font.widthOfTextAtSize(band.text, band.fontSize);
      page.drawText(band.text, {
        x: alignedX(band.align, page.getWidth(), width, band.margin),
        y:
          position === 'top'
            ? page.getHeight() - band.margin - band.fontSize
            : band.margin,
        size: band.fontSize,
        font,
        color: asColor(band.color),
      });
    });
  }

  const numbers = options.pageNumbers;
  if (numbers.enabled) {
    const font = await fontOf(numbers.fontKey, numbers.format);
    const total = pages.length;
    pages.forEach((page, index) => {
      if (numbers.skipFirstPage && index === 0) return;
      const label = numbers.format
        .replaceAll('{n}', String(index + numbers.startAt))
        .replaceAll('{total}', String(total));
      const width = font.widthOfTextAtSize(label, numbers.fontSize);
      page.drawText(label, {
        x: alignedX(numbers.align, page.getWidth(), width, numbers.margin),
        y:
          numbers.position === 'top'
            ? page.getHeight() - numbers.margin - numbers.fontSize
            : numbers.margin,
        size: numbers.fontSize,
        font,
        color: asColor(numbers.color),
      });
    });
  }

  const mark = options.watermark;
  if (mark.enabled && mark.mode === 'image' && mark.dataUrl) {
    const stamp = mark.dataUrl.startsWith('data:image/jpeg')
      ? await doc.embedJpg(mark.dataUrl)
      : await doc.embedPng(mark.dataUrl);
    const radians = (mark.rotation * Math.PI) / 180;
    for (const page of pages) {
      const width = mark.widthPct * page.getWidth();
      const height = width * mark.aspect;
      // drawImage rotates about its origin, so the corner is walked back to keep the stamp centred.
      page.drawImage(stamp, {
        x:
          page.getWidth() / 2 -
          (Math.cos(radians) * width) / 2 +
          (Math.sin(radians) * height) / 2,
        y:
          page.getHeight() / 2 -
          (Math.sin(radians) * width) / 2 -
          (Math.cos(radians) * height) / 2,
        width,
        height,
        opacity: mark.opacity,
        rotate: degrees(mark.rotation),
      });
    }
  } else if (mark.enabled && mark.mode === 'text' && mark.text.trim()) {
    const font = await fontOf(mark.fontKey, mark.text);
    const radians = (mark.rotation * Math.PI) / 180;
    for (const page of pages) {
      const width = font.widthOfTextAtSize(mark.text, mark.fontSize);
      // Rotation pivots on the draw origin, so the start point is pulled back to keep the text centred.
      page.drawText(mark.text, {
        x:
          page.getWidth() / 2 -
          (Math.cos(radians) * width) / 2 +
          (Math.sin(radians) * mark.fontSize) / 2,
        y:
          page.getHeight() / 2 -
          (Math.sin(radians) * width) / 2 -
          (Math.cos(radians) * mark.fontSize) / 2,
        size: mark.fontSize,
        font,
        color: asColor(mark.color),
        opacity: mark.opacity,
        rotate: degrees(mark.rotation),
      });
    }
  }

  const { title, author, subject } = options.metadata;
  if (title.trim()) doc.setTitle(title.trim());
  if (author.trim()) doc.setAuthor(author.trim());
  if (subject.trim()) doc.setSubject(subject.trim());

  return doc.save();
}

/** One existing text run on a page, in the editor's top-left percentage space. */
export interface PageTextRun {
  id: string;
  text: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  /** Point size, so a replacement can match the original exactly. */
  fontSize: number;
  fontKey: EditFontKey;
}

const fontKeyFor = (font: unknown): EditFontKey => {
  const f = (font ?? {}) as {
    name?: string;
    bold?: boolean;
    italic?: boolean;
    black?: boolean;
  };
  const name = (f.name ?? '').toLowerCase();
  const bold =
    f.bold === true || f.black === true || /bold|black|heavy/.test(name);
  const italic = f.italic === true || /italic|oblique/.test(name);
  if (/courier|mono/.test(name)) return bold ? 'courier-bold' : 'courier';
  if (/times|roman|serif|georgia|garamond/.test(name))
    return bold ? 'times-bold' : italic ? 'times-italic' : 'times';
  return bold ? 'helvetica-bold' : italic ? 'helvetica-italic' : 'helvetica';
};

/** Reads the existing text of one page so a run can be covered and retyped in place. */
export async function pageTextRuns(
  file: File,
  pageIndex: number
): Promise<PageTextRun[]> {
  const { pdfjsLib } = await import('./pdfjsSetup');
  const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() })
    .promise;
  const page = await doc.getPage(pageIndex + 1);
  const { width, height } = page.getViewport({ scale: 1 });
  // commonObjs only holds the real fonts once the operator list has been built.
  await page.getOperatorList();
  const content = await page.getTextContent();

  return content.items.flatMap((item, index): PageTextRun[] => {
    if (!('str' in item) || !item.str.trim()) return [];
    const x = item.transform[4] as number;
    const baseline = item.transform[5] as number;
    const size =
      Math.abs(item.height) || Math.abs(item.transform[3] as number) || 10;
    const runWidth = item.width || size * item.str.length * 0.5;

    let font: unknown = null;
    try {
      font = page.commonObjs.get(String(item.fontName));
    } catch {
      font = null;
    }

    return [
      {
        id: `run-${pageIndex}-${index}`,
        text: item.str,
        xPct: x / width,
        // Matches the baseline formula the exporter uses, so a retype lands exactly.
        yPct: (height - baseline - size) / height,
        widthPct: runWidth / width,
        heightPct: (size * 1.32) / height,
        fontSize: Math.round(size * 10) / 10,
        fontKey: fontKeyFor(font),
      },
    ];
  });
}
