import { pdfjsLib } from './pdfjsSetup';
import { fixBengaliVisualOrder } from './bengaliText';

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

/** Infers the language from the document; Bangladeshi paperwork is usually mixed, so both models load together. */
export const detectOcrLanguage = (sampleText: string): OcrLanguage => {
  if (/[ঀ-৿]/.test(sampleText)) return 'eng+ben';
  // Nothing to go on means a pure scan; covering both costs one extra model.
  return sampleText.trim().length < 40 ? 'eng+ben' : 'eng';
};

/** Greys and thresholds the page: Tesseract is trained on clean black-on-white scans. */
function preprocess(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = image;

  const histogram = new Uint32Array(256);
  const grey = new Uint8ClampedArray(data.length / 4);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const value =
      ((data[i] as number) * 299 +
        (data[i + 1] as number) * 587 +
        (data[i + 2] as number) * 114) /
      1000;
    grey[p] = value;
    histogram[Math.round(value)] = (histogram[Math.round(value)] ?? 0) + 1;
  }

  // Otsu's threshold: the cut that best separates ink from paper.
  const total = grey.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * (histogram[i] ?? 0);
  let sumB = 0;
  let weightB = 0;
  let best = 0;
  let threshold = 128;
  for (let i = 0; i < 256; i++) {
    weightB += histogram[i] ?? 0;
    if (weightB === 0) continue;
    const weightF = total - weightB;
    if (weightF === 0) break;
    sumB += i * (histogram[i] ?? 0);
    const between =
      weightB * weightF * Math.pow(sumB / weightB - (sum - sumB) / weightF, 2);
    if (between > best) {
      best = between;
      threshold = i;
    }
  }

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const value = (grey[p] as number) > threshold ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
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
  const ctx = canvas.getContext('2d');
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
  const worker = await createWorker(language, 1, {
    logger: (message: { status: string; progress: number }) =>
      onProgress?.({
        page: current,
        totalPages: pageNumbers.length,
        status: message.status,
        progress: message.progress,
      }),
  });

  try {
    for (const [index, pageNumber] of pageNumbers.entries()) {
      current = index + 1;
      const page = await doc.getPage(pageNumber);
      const canvas = await renderPageBitmap(
        page as unknown as Parameters<typeof renderPageBitmap>[0],
        OCR_SCALE
      );
      preprocess(canvas);
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
              x: x0 / OCR_SCALE,
              right: x1 / OCR_SCALE,
              // Canvas y grows downward while PDF y grows upward, so it is flipped back.
              y: (canvas.height - y1) / OCR_SCALE,
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

export interface OcrImageResult {
  text: string;
  confidence: number;
}

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
  const worker = await createWorker(resolved, 1, {
    logger: (message: { status: string; progress: number }) =>
      onProgress?.({
        page: current,
        totalPages: files.length,
        status: message.status,
        progress: message.progress,
      }),
  });

  try {
    const results: OcrImageResult[] = [];
    for (const [index, file] of files.entries()) {
      current = index + 1;
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is not supported in this browser.');
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      preprocess(canvas);

      const { data } = await worker.recognize(canvas);
      results.push({
        text: fixBengaliVisualOrder(data.text.trim()),
        confidence: data.confidence ?? 0,
      });
      canvas.width = 0;
      canvas.height = 0;
    }
    return results;
  } finally {
    await worker.terminate();
  }
}
