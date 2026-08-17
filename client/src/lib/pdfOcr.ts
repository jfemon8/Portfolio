import { pdfjsLib } from './pdfjsSetup';
import { PSM } from 'tesseract.js';
import { layoutToText, type LayoutLine } from './docxWriter';

/** One OCR-recovered line, already converted back into PDF point coordinates. */
export interface OcrLine {
  text: string;
  x: number;
  right: number;
  y: number;
  size: number;
}

export type OcrLanguage = 'eng' | 'ben' | 'eng+ben';

export const OCR_LANGUAGES: Array<{ value: OcrLanguage; label: string }> = [
  { value: 'eng', label: 'English' },
  { value: 'ben', label: 'Bengali' },
  { value: 'eng+ben', label: 'English + Bengali' },
];

/** Recognition accuracy climbs steeply with resolution, and flattens out around here. */
const OCR_SCALE = 2.2;

/** Roughly an A4 page at 200 dpi: below this the engine starts guessing at stroke widths. */
const OCR_MIN_WIDTH = 1700;

/** Sauvola's two constants, at the values his paper settles on for document images. */
const SAUVOLA_K = 0.22;
const SAUVOLA_RANGE = 128;

/** Tesseract scores each line it thinks it read; below this it is reading paper grain, not text. */
const LINE_CONFIDENCE_FLOOR = 45;

/** Bengali conjuncts and matras score lower than Latin even when read correctly, so they are held to a lower bar. */
const BENGALI_CONFIDENCE_FLOOR = 30;

/** The slower LSTM models, which are the difference between readable and unusable for Indic scripts. */
const BEST_MODELS = 'https://tessdata.projectnaptha.com/4.0.0_best';

/** Passed as the engine's init config, so they apply before the first page rather than after it. */
const ENGINE_CONFIG = [
  // Declaring the density stops Tesseract guessing it per image, which it warns about and gets wrong.
  'user_defined_dpi 300',
  // Bengali words otherwise run together, because the LSTM is stingy with spaces on conjunct-heavy scripts.
  'preserve_interword_spaces 1',
  // Leptonica's box warnings are written straight to the console otherwise, several per page.
  'debug_file /dev/null',
].join('\n');

/** Must track the tesseract.js-core version tesseract.js itself resolves, or the glue and the worker disagree. */
const CORE_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0';

/** The SIMD probe from wasm-feature-detect, which is what tesseract.js uses to choose a build. */
const supportsSimd = (): boolean =>
  WebAssembly.validate(
    new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10,
      1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
    ])
  );

/** Names the core file explicitly, which skips tesseract.js's own auto-selection. Its relaxed-SIMD build imports DotProductSSE, a symbol none of the v7.0.0 wasm binaries define, so recognition aborts on any browser that reports relaxed SIMD. */
const corePath = (): string =>
  `${CORE_CDN}/tesseract-core${supportsSimd() ? '-simd' : ''}-lstm.wasm.js`;

/** Bengali needs the accurate models; English alone does not, and they cost several megabytes. */
const workerOptionsFor = (
  language: OcrLanguage
): { langPath?: string; corePath: string } => ({
  corePath: corePath(),
  ...(language.includes('ben') ? { langPath: BEST_MODELS } : {}),
});

/** Infers the language from the document; Bangladeshi paperwork is usually mixed, so both models load together. */
export const detectOcrLanguage = (sampleText: string): OcrLanguage => {
  if (/[ঀ-৿]/.test(sampleText)) return 'eng+ben';
  // Nothing to go on means a pure scan; covering both costs one extra model.
  return sampleText.trim().length < 40 ? 'eng+ben' : 'eng';
};

/** getContext returns the first context a canvas was given, so the read-back hint has to be set on that first call. */
const readableContext = (
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D | null =>
  canvas.getContext('2d', { willReadFrequently: true });

const toGrey = (data: Uint8ClampedArray): Uint8ClampedArray => {
  const grey = new Uint8ClampedArray(data.length / 4);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1)
    grey[p] =
      ((data[i] as number) * 299 +
        (data[i + 1] as number) * 587 +
        (data[i + 2] as number) * 114) /
      1000;
  return grey;
};

/** Trims a photo down to the sheet of paper, so a desk or a shadow is never read as ink. */
function documentBounds(
  grey: Uint8ClampedArray,
  width: number,
  height: number
): { x: number; y: number; width: number; height: number } {
  let max = 0;
  for (let i = 0; i < grey.length; i++) max = Math.max(max, grey[i] as number);
  const bright = max * 0.72;

  const rows = new Float32Array(height);
  const cols = new Float32Array(width);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if ((grey[y * width + x] as number) >= bright) {
        rows[y] = (rows[y] ?? 0) + 1;
        cols[x] = (cols[x] ?? 0) + 1;
      }

  const span = (profile: Float32Array, limit: number): [number, number] => {
    const need = limit * 0.35;
    let start = 0;
    let end = profile.length - 1;
    while (start < end && (profile[start] ?? 0) < need) start++;
    while (end > start && (profile[end] ?? 0) < need) end--;
    return [start, end];
  };

  const [top, bottom] = span(rows, width);
  const [left, right] = span(cols, height);
  const w = right - left;
  const h = bottom - top;
  // Anything smaller than a third of the frame is a false positive, not a page.
  if (w < width * 0.33 || h < height * 0.33)
    return { x: 0, y: 0, width, height };
  return { x: left, y: top, width: w, height: h };
}

/** True when nearly every pixel is already ink or already paper, which is what a screenshot or a clean scan looks like. */
function alreadySeparated(grey: Uint8ClampedArray): boolean {
  let polar = 0;
  for (let i = 0; i < grey.length; i++) {
    const value = grey[i] as number;
    if (value < 70 || value > 205) polar++;
  }
  return polar / grey.length > 0.95;
}

/** The greyscale copy the handwriting model reads, plus the white margin every coordinate has to be shifted back by. */
interface Preprocessed {
  plain: HTMLCanvasElement;
  pad: number;
}

/** Local thresholding rather than one global cut: a photographed page carries shadows a single cut turns into ink. */
function preprocess(
  canvas: HTMLCanvasElement,
  minWidth = 0
): Preprocessed | null {
  const ctx = readableContext(canvas);
  if (!ctx) return null;

  const full = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const grey = toGrey(full.data);
  const bounds = documentBounds(grey, canvas.width, canvas.height);

  // A small scan loses thin strokes to the threshold, so it is enlarged before anything reads it.
  const zoom =
    minWidth > bounds.width ? Math.min(3, minWidth / bounds.width) : 1;
  const scaledWidth = Math.round(bounds.width * zoom);
  const scaledHeight = Math.round(bounds.height * zoom);
  const pad = Math.max(20, Math.round(scaledWidth * 0.02));

  const stage = document.createElement('canvas');
  stage.width = bounds.width;
  stage.height = bounds.height;
  readableContext(stage)?.putImageData(
    ctx.getImageData(bounds.x, bounds.y, bounds.width, bounds.height),
    0,
    0
  );
  canvas.width = scaledWidth + pad * 2;
  canvas.height = scaledHeight + pad * 2;
  // Text running to the very edge leaves Tesseract computing boxes outside the image.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(stage, pad, pad, scaledWidth, scaledHeight);
  stage.width = 0;
  stage.height = 0;

  const { width, height } = canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const source = toGrey(image.data);

  // Kept aside before thresholding: the handwriting model reads greys, not a hard mask.
  const plain = document.createElement('canvas');
  plain.width = width;
  plain.height = height;
  readableContext(plain)?.drawImage(canvas, 0, 0);

  // A screenshot or a clean scan is already separated; thresholding it again only eats thin matras and conjunct joins.
  if (alreadySeparated(source)) return { plain, pad };

  // Summed-area tables so each pixel's neighbourhood mean and deviation cost four lookups each.
  const stride = width + 1;
  const integral = new Float64Array(stride * (height + 1));
  const squares = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let run = 0;
    let runSq = 0;
    for (let x = 0; x < width; x++) {
      const value = source[y * width + x] as number;
      run += value;
      runSq += value * value;
      integral[(y + 1) * stride + (x + 1)] =
        (integral[y * stride + (x + 1)] as number) + run;
      squares[(y + 1) * stride + (x + 1)] =
        (squares[y * stride + (x + 1)] as number) + runSq;
    }
  }

  const radius = Math.max(8, Math.round(Math.min(width, height) / 45));
  const data = image.data;
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const box = (table: Float64Array): number =>
        (table[(y1 + 1) * stride + (x1 + 1)] as number) -
        (table[y0 * stride + (x1 + 1)] as number) -
        (table[(y1 + 1) * stride + x0] as number) +
        (table[y0 * stride + x0] as number);
      const mean = box(integral) / area;
      const deviation = Math.sqrt(
        Math.max(0, box(squares) / area - mean * mean)
      );
      // Sauvola: on blank paper the deviation collapses and the cut drops well below the mean, so grain stays white.
      const cut = mean * (1 + SAUVOLA_K * (deviation / SAUVOLA_RANGE - 1));
      const ink = (source[y * width + x] as number) < cut;
      const value = ink ? 0 : 255;
      const i = (y * width + x) * 4;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return { plain, pad };
}

/** Below this the read is unusable, and the caller should say so rather than show noise. */
export const OCR_USABLE_CONFIDENCE = 55;

type RecogniseResult = Awaited<
  ReturnType<
    Awaited<ReturnType<typeof import('tesseract.js').createWorker>>['recognize']
  >
>;

/** Auto segmentation assumes a dense printed page, so sparse mode is tried too and the more confident read wins. */
async function recogniseBest(
  worker: Awaited<ReturnType<typeof import('tesseract.js').createWorker>>,
  canvas: HTMLCanvasElement
): Promise<RecogniseResult> {
  const first = await worker.recognize(canvas, {}, { blocks: true });
  if ((first.data.confidence ?? 0) >= 70) return first;

  await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
  const sparse = await worker.recognize(canvas, {}, { blocks: true });
  await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
  return (sparse.data.confidence ?? 0) > (first.data.confidence ?? 0)
    ? sparse
    : first;
}

export interface OcrProgress {
  page: number;
  totalPages: number;
  status: string;
  progress: number;
}

interface TesseractBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface TesseractLine {
  text: string;
  bbox: TesseractBox;
  confidence?: number;
}

/** Rasterises one page so the OCR engine has an image to read. */
async function renderPageBitmap(
  page: Awaited<
    ReturnType<typeof pdfjsLib.getDocument>['promise']
  > extends never
    ? never
    : {
        getViewport: (o: { scale: number }) => {
          width: number;
          height: number;
        };
        render: (o: never) => { promise: Promise<void> };
      },
  scale: number
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = readableContext(canvas);
  if (!ctx)
    throw new Error('Canvas rendering is not supported in this browser.');
  // A white ground matters: OCR on a transparent canvas reads as a black page.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport } as never).promise;
  return canvas;
}

/** Reads pages with no text layer; the worker and language data are fetched only when called. */
export async function ocrPdfPages(
  file: File,
  pageNumbers: number[],
  language: OcrLanguage,
  onProgress?: (progress: OcrProgress) => void
): Promise<Map<number, OcrLine[]>> {
  const results = new Map<number, OcrLine[]>();
  if (pageNumbers.length === 0) return results;

  const { createWorker } = await import('tesseract.js');
  const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() })
    .promise;

  let current = 0;
  const worker = await createWorker(
    language,
    1,
    {
      ...workerOptionsFor(language),
      logger: (message: { status: string; progress: number }) =>
        onProgress?.({
          page: current,
          totalPages: pageNumbers.length,
          status: message.status,
          progress: message.progress,
        }),
    },
    ENGINE_CONFIG
  );

  try {
    for (const [index, pageNumber] of pageNumbers.entries()) {
      current = index + 1;
      const page = await doc.getPage(pageNumber);
      const canvas = await renderPageBitmap(
        page as unknown as Parameters<typeof renderPageBitmap>[0],
        OCR_SCALE
      );
      const pad = preprocess(canvas)?.pad ?? 0;
      const { data } = await worker.recognize(canvas, {}, { blocks: true });

      const lines = (
        (data.blocks ?? []) as Array<{
          paragraphs?: Array<{ lines?: TesseractLine[] }>;
        }>
      )
        .flatMap((block) => block.paragraphs ?? [])
        .flatMap((paragraph) => paragraph.lines ?? [])
        .flatMap((line): OcrLine[] => {
          const text = line.text.replace(/\s+/g, ' ').trim();
          if (!text) return [];
          const { x0, x1, y0, y1 } = line.bbox;
          const height = (y1 - y0) / OCR_SCALE;
          return [
            {
              text,
              // The white quiet zone is not part of the page, so it comes back off every coordinate.
              x: (x0 - pad) / OCR_SCALE,
              right: (x1 - pad) / OCR_SCALE,
              // Canvas y grows downward while PDF y grows upward, so it is flipped back.
              y: (canvas.height - pad - y1) / OCR_SCALE,
              // A line box spans ascender to descender; the type size is a bit smaller.
              size: Math.max(6, height * 0.78),
            },
          ];
        });

      results.set(pageNumber, lines);
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await worker.terminate();
  }
  return results;
}

export type { LayoutLine };

export interface OcrImageResult {
  text: string;
  lines: LayoutLine[];
  /** Source width, the reference every alignment decision is measured against. */
  width: number;
  confidence: number;
  /** Which engine produced this read, so the caller can explain a weak result. */
  mode: 'printed' | 'handwriting' | 'handwriting-unavailable';
}

/** Last resort when layout analysis returns no paragraphs: the flat transcript, stacked as evenly spaced lines. */
function flatTextLines(
  text: string | undefined,
  canvas: HTMLCanvasElement
): LayoutLine[] {
  const rows = (text ?? '')
    .split(/\r?\n/)
    .map((row) =>
      row
        .replace(/[ \t]+/g, ' ')
        .trim()
        .normalize('NFC')
    )
    .filter(Boolean);
  if (!rows.length) return [];
  const size = Math.max(10, canvas.height / (rows.length * 1.6));
  return rows.map((row, i) => ({
    text: row,
    x: 0,
    right: canvas.width,
    y: i * size * 1.4,
    size,
  }));
}

/** A Bengali-heavy read rules the handwriting model out: TrOCR only ever learnt Latin script. */
const isBengaliHeavy = (text: string): boolean => {
  const bengali = text.match(/[ঀ-৿]/g)?.length ?? 0;
  const latin = text.match(/[A-Za-z]/g)?.length ?? 0;
  return bengali > latin;
};

/** Reads plain image files, for the standalone Image-to-Text tool. */
export async function ocrImages(
  files: File[],
  language: OcrLanguage | 'auto',
  onProgress?: (progress: OcrProgress) => void
): Promise<OcrImageResult[]> {
  if (!files.length) return [];
  const { createWorker } = await import('tesseract.js');
  // With nothing to sample from, both models are loaded so either script reads.
  const resolved = language === 'auto' ? 'eng+ben' : language;

  let current = 0;
  const worker = await createWorker(
    resolved,
    1,
    {
      ...workerOptionsFor(resolved),
      logger: (message: { status: string; progress: number }) =>
        onProgress?.({
          page: current,
          totalPages: files.length,
          status: message.status,
          progress: message.progress,
        }),
    },
    ENGINE_CONFIG
  );

  try {
    const results: OcrImageResult[] = [];
    for (const [index, file] of files.entries()) {
      current = index + 1;
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = readableContext(canvas);
      if (!ctx) throw new Error('Canvas is not supported in this browser.');
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      const processed = preprocess(canvas, OCR_MIN_WIDTH);
      const pad = processed?.pad ?? 0;
      // Coordinates are reported inside the padded canvas, so the page's own width is what alignment is measured against.
      const pageWidth = canvas.width - pad * 2;

      const attempt = await recogniseBest(worker, canvas);
      const { data } = attempt;
      const lines = (
        (data.blocks ?? []) as Array<{
          paragraphs?: Array<{ lines?: TesseractLine[] }>;
        }>
      )
        .flatMap((block) => block.paragraphs ?? [])
        .flatMap((paragraph) => paragraph.lines ?? [])
        .flatMap((line): LayoutLine[] => {
          // Tesseract already emits logical order; only the composition is normalised.
          const text = line.text.replace(/\s+/g, ' ').trim().normalize('NFC');
          // A blank page still yields "lines"; their own score is what separates them from real text.
          const floor = /[ঀ-৿]/.test(text)
            ? BENGALI_CONFIDENCE_FLOOR
            : LINE_CONFIDENCE_FLOOR;
          if (!text || (line.confidence ?? 0) < floor) return [];
          const { x0, x1, y0, y1 } = line.bbox;
          return [
            {
              text,
              x: x0 - pad,
              right: x1 - pad,
              y: y0 - pad,
              size: (y1 - y0) * 0.78,
            },
          ];
        })
        .sort((a, b) => a.y - b.y || a.x - b.x);

      // Tesseract classifies a ruled table as its own block type, which carries no paragraphs; its flat text still holds the cells.
      const recovered = lines.length ? lines : flatTextLines(data.text, canvas);
      const confidence = data.confidence ?? 0;
      const printed: OcrImageResult = {
        text: layoutToText(recovered, pageWidth),
        lines: recovered,
        width: pageWidth,
        confidence,
        mode: 'printed',
      };

      // A weak printed read is the signal that the page is handwritten, so the other engine gets a turn.
      if (confidence >= OCR_USABLE_CONFIDENCE || !processed)
        results.push(printed);
      else if (isBengaliHeavy(printed.text))
        results.push({ ...printed, mode: 'handwriting-unavailable' });
      else {
        const { readHandwriting } = await import('./handwritingOcr');
        const written = await readHandwriting(processed.plain, canvas, (p) =>
          onProgress?.({
            page: current,
            totalPages: files.length,
            status: p.status,
            progress: p.progress,
          })
        );
        const shifted = written.lines.map((line) => ({
          ...line,
          x: line.x - pad,
          right: line.right - pad,
          y: line.y - pad,
        }));
        results.push(
          shifted.length
            ? {
                text: layoutToText(shifted, pageWidth),
                lines: shifted,
                width: pageWidth,
                confidence,
                mode: 'handwriting',
              }
            : printed
        );
      }

      if (processed) {
        processed.plain.width = 0;
        processed.plain.height = 0;
      }
      canvas.width = 0;
      canvas.height = 0;
    }
    return results;
  } finally {
    await worker.terminate();
  }
}
