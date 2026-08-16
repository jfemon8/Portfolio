import type { LayoutLine } from './docxWriter';

/** TrOCR reads one line at a time, so the page has to be cut into lines first. */
const MODEL = 'Xenova/trocr-small-handwritten';

/** Encoder plus decoder at int8, which is what the browser actually downloads once. */
export const HANDWRITING_MODEL_MB = 61;

export interface HandwritingProgress {
  status: string;
  progress: number;
}

interface Band {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

type Recognizer = (
  image: unknown,
  options?: Record<string, unknown>
) => Promise<Array<{ generated_text: string }>>;

let cached: Promise<Recognizer> | null = null;
let notify: ((progress: HandwritingProgress) => void) | undefined;

/** The pipeline is built once and reused; only the first call pays the download. */
async function recognizer(): Promise<Recognizer> {
  cached ??= (async () => {
    const { pipeline, env } = await import('@huggingface/transformers');
    // No local model server exists here, so the files come straight from the hub.
    env.allowLocalModels = false;
    // Bytes so far per file, since the model arrives as several files at once each reporting its own 0-100.
    const downloads = new Map<string, number>();
    const pipe = await pipeline('image-to-text', MODEL, {
      dtype: 'q8',
      progress_callback: (event: {
        status: string;
        file?: string;
        loaded?: number;
      }) => {
        if (event.status !== 'progress' || !event.file) return;
        downloads.set(event.file, event.loaded ?? 0);
        let loaded = 0;
        for (const bytes of downloads.values()) loaded += bytes;
        // Measured against the whole model rather than the files started so far, which begins at 100% on the first small one.
        notify?.({
          status: 'processing handwriting model . . .',
          progress: Math.min(1, loaded / (HANDWRITING_MODEL_MB * 1024 * 1024)),
        });
      },
    });
    return pipe as unknown as Recognizer;
  })();
  try {
    return await cached;
  } catch (error) {
    // A failed download must not poison every later attempt.
    cached = null;
    throw error;
  }
}

/** Groups rows of ink into text lines, ignoring the speckle a phone camera leaves behind. */
function segmentLines(canvas: HTMLCanvasElement): Band[] {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);

  const rows = new Int32Array(height);
  const ink = new Uint8Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if ((data[(y * width + x) * 4] as number) >= 128) continue;
      ink[y * width + x] = 1;
      rows[y] = (rows[y] ?? 0) + 1;
    }

  const floor = Math.max(2, Math.round(width * 0.004));
  const raw: Band[] = [];
  for (let y = 0; y < height; y++) {
    if ((rows[y] ?? 0) <= floor) continue;
    const start = y;
    while (y < height && (rows[y] ?? 0) > floor) y++;
    raw.push({ top: start, bottom: y, left: 0, right: width });
  }
  if (!raw.length) return [];

  const heights = raw.map((b) => b.bottom - b.top).sort((a, b) => a - b);
  const median = heights[Math.floor(heights.length / 2)] ?? 1;

  // Ascenders and descenders break a line into slivers, so near neighbours are rejoined.
  const merged: Band[] = [];
  for (const band of raw) {
    const last = merged[merged.length - 1];
    if (last && band.top - last.bottom < median * 0.45)
      last.bottom = band.bottom;
    else merged.push({ ...band });
  }

  return merged
    .filter((band) => band.bottom - band.top >= Math.max(8, median * 0.5))
    .map((band) => {
      let left = width;
      let right = 0;
      for (let y = band.top; y < band.bottom; y++)
        for (let x = 0; x < width; x++)
          if (ink[y * width + x]) {
            if (x < left) left = x;
            if (x > right) right = x;
          }
      return left < right ? { ...band, left, right } : null;
    })
    .filter((band): band is Band => band !== null);
}

/** Crops one line onto a white ground, which is the shape TrOCR was trained on. */
function cropLine(
  source: HTMLCanvasElement,
  band: Band
): HTMLCanvasElement | null {
  const padY = Math.round((band.bottom - band.top) * 0.3);
  const padX = Math.round((band.bottom - band.top) * 0.2);
  const x = Math.max(0, band.left - padX);
  const y = Math.max(0, band.top - padY);
  const width = Math.min(source.width - x, band.right - band.left + padX * 2);
  const height = Math.min(source.height - y, band.bottom - band.top + padY * 2);
  if (width < 8 || height < 8) return null;

  const line = document.createElement('canvas');
  line.width = width;
  line.height = height;
  // TrOCR reads the crop straight back out of the canvas, so the hint belongs on this first call.
  const ctx = line.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, x, y, width, height, 0, 0, width, height);
  return line;
}

/** TrOCR decodes with an English language model, so a lone glyph comes back as a whole invented word; a band only physically holds so many characters. */
function fitsTheInk(band: Band, text: string): boolean {
  const height = band.bottom - band.top;
  if (height <= 0) return true;
  const capacity = Math.max(1, (band.right - band.left) / (height * 0.6));
  return text.length <= capacity + 2;
}

export interface HandwritingResult {
  text: string;
  lines: LayoutLine[];
}

/** Reads handwriting off a cropped page: `plain` is the greyscale TrOCR sees, `mask` the binarised copy lines are found in. */
export async function readHandwriting(
  plain: HTMLCanvasElement,
  mask: HTMLCanvasElement,
  onProgress?: (progress: HandwritingProgress) => void
): Promise<HandwritingResult> {
  const bands = segmentLines(mask);
  if (!bands.length) return { text: '', lines: [] };

  notify = onProgress;
  const read = await recognizer();
  notify = undefined;

  const lines: LayoutLine[] = [];
  for (const [index, band] of bands.entries()) {
    onProgress?.({
      status: `reading handwritten line ${index + 1}/${bands.length}`,
      progress: index / bands.length,
    });
    const crop = cropLine(plain, band);
    if (!crop) continue;
    const output = await read(crop, { max_new_tokens: 128 });
    crop.width = 0;
    crop.height = 0;
    const text = (output[0]?.generated_text ?? '').trim();
    if (!text || !fitsTheInk(band, text)) continue;
    lines.push({
      text,
      x: band.left,
      right: band.right,
      y: band.top,
      size: (band.bottom - band.top) * 0.7,
    });
  }

  return { text: lines.map((line) => line.text).join('\n'), lines };
}
