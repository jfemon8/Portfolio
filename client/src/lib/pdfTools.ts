import { PDFDocument, EncryptedPDFError, type PDFImage } from 'pdf-lib';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { pdfjsLib } from './pdfjsSetup';

export interface PdfSummary {
  pageCount: number;
  sizeBytes: number;
}

export async function loadPdf(bytes: ArrayBuffer): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes);
  } catch (err) {
    if (err instanceof EncryptedPDFError) {
      throw new Error(
        'This PDF is password-protected — remove the password before using it here.'
      );
    }
    throw new Error(
      'This file could not be read as a PDF. Make sure it is a valid, unencrypted PDF.'
    );
  }
}

export async function readPdfSummary(file: File): Promise<PdfSummary> {
  const bytes = await file.arrayBuffer();
  const doc = await loadPdf(bytes);
  return { pageCount: doc.getPageCount(), sizeBytes: bytes.byteLength };
}

async function renderPageToDataUrl(
  doc: PDFDocumentProxy,
  pageNumber: number,
  scale: number
): Promise<string> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx)
    throw new Error('Canvas rendering is not supported in this browser.');
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/png');
}

export async function renderPageThumbnails(
  file: File,
  scale = 0.32
): Promise<string[]> {
  const bytes = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
  const thumbs: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    thumbs.push(await renderPageToDataUrl(doc, i, scale));
  }
  return thumbs;
}

export interface FirstPageInfo {
  thumbnail: string;
  pageCount: number;
}

export async function renderFirstPageInfo(
  file: File,
  scale = 0.32
): Promise<FirstPageInfo> {
  const bytes = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
  return {
    thumbnail: await renderPageToDataUrl(doc, 1, scale),
    pageCount: doc.numPages,
  };
}

export async function renderSinglePage(
  file: File,
  pageIndex: number,
  scale: number
): Promise<string> {
  const bytes = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
  return renderPageToDataUrl(doc, pageIndex + 1, scale);
}

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const src = await loadPdf(bytes);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  return merged.save();
}

export async function extractPages(
  file: File,
  pageIndices: number[]
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const src = await loadPdf(bytes);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, pageIndices);
  pages.forEach((p) => out.addPage(p));
  return out.save();
}

export async function splitIntoSinglePages(file: File): Promise<Uint8Array[]> {
  const bytes = await file.arrayBuffer();
  const src = await loadPdf(bytes);
  const outputs: Uint8Array[] = [];
  for (let i = 0; i < src.getPageCount(); i++) {
    const out = await PDFDocument.create();
    const [page] = await out.copyPages(src, [i]);
    if (page) out.addPage(page);
    outputs.push(await out.save());
  }
  return outputs;
}

export async function compressSafe(file: File): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const doc = await loadPdf(bytes);
  return doc.save({ useObjectStreams: true });
}

export interface RasterCompressOptions {
  scale: number;
  quality: number;
}

// Rasterizes every page to a JPEG and rebuilds the PDF from those images — trades text-selectability for size.
export async function compressRaster(
  file: File,
  opts: RasterCompressOptions,
  onProgress?: (done: number, total: number) => void
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const srcJs = await pdfjsLib.getDocument({ data: bytes }).promise;
  const out = await PDFDocument.create();
  const total = srcJs.numPages;
  for (let i = 1; i <= total; i++) {
    const page = await srcJs.getPage(i);
    const renderViewport = page.getViewport({ scale: opts.scale });
    const canvas = document.createElement('canvas');
    canvas.width = renderViewport.width;
    canvas.height = renderViewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx)
      throw new Error('Canvas rendering is not supported in this browser.');
    await page.render({ canvas, canvasContext: ctx, viewport: renderViewport })
      .promise;
    const jpegDataUrl = canvas.toDataURL('image/jpeg', opts.quality);
    const jpegImage = await out.embedJpg(jpegDataUrl);

    const baseViewport = page.getViewport({ scale: 1 });
    const pdfPage = out.addPage([baseViewport.width, baseViewport.height]);
    pdfPage.drawImage(jpegImage, {
      x: 0,
      y: 0,
      width: baseViewport.width,
      height: baseViewport.height,
    });

    onProgress?.(i, total);
    // Yield to the event loop so the progress bar actually paints between pages.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return out.save();
}

export interface SignaturePlacement {
  pageIndex: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  signaturePngDataUrl: string;
}

export async function applySignatures(
  file: File,
  placements: SignaturePlacement[]
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const doc = await loadPdf(bytes);
  // One signature reused across pages is embedded once, so repeating it costs almost no file size.
  const embedded = new Map<string, PDFImage>();

  for (const placement of placements) {
    let image = embedded.get(placement.signaturePngDataUrl);
    if (!image) {
      image = await doc.embedPng(placement.signaturePngDataUrl);
      embedded.set(placement.signaturePngDataUrl, image);
    }
    const page = doc.getPage(placement.pageIndex);
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    const scaled = image.scale((placement.widthPct * pageWidth) / image.width);
    page.drawImage(image, {
      x: placement.xPct * pageWidth,
      // UI coordinates are top-left origin; PDF coordinates are bottom-left origin.
      y: pageHeight - placement.yPct * pageHeight - scaled.height,
      width: scaled.width,
      height: scaled.height,
    });
  }
  return doc.save();
}

const MAX_SIGNATURE_DIMENSION = 1200;
const WHITE_THRESHOLD = 235;

export interface SignatureImage {
  dataUrl: string;
  aspect: number;
}

// Normalizes any uploaded image to PNG, optionally clearing the white background of a photographed signature.
export async function imageFileToSignaturePng(
  file: File,
  removeWhiteBackground: boolean
): Promise<SignatureImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    MAX_SIGNATURE_DIMENSION / Math.max(bitmap.width, bitmap.height)
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx)
    throw new Error('Canvas rendering is not supported in this browser.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  if (removeWhiteBackground) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (
        data[i]! > WHITE_THRESHOLD &&
        data[i + 1]! > WHITE_THRESHOLD &&
        data[i + 2]! > WHITE_THRESHOLD
      ) {
        data[i + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  return { dataUrl: canvas.toDataURL('image/png'), aspect: height / width };
}

export function formatPageRanges(indices: number[]): string {
  if (!indices.length) return '';
  const sorted = [...new Set(indices)].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0]!;
  let prev = sorted[0]!;
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur !== undefined && cur === prev + 1) {
      prev = cur;
      continue;
    }
    parts.push(start === prev ? `${start + 1}` : `${start + 1}-${prev + 1}`);
    if (cur === undefined) break;
    start = cur;
    prev = cur;
  }
  return parts.join(', ');
}

export function parsePageRanges(input: string, pageCount: number): number[] {
  const indices = new Set<number>();
  const chunks = input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const chunk of chunks) {
    const match = chunk.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) {
      throw new Error(
        `"${chunk}" is not a valid page or range (try "1-3" or "5").`
      );
    }
    const from = parseInt(match[1]!, 10);
    const to = match[2] ? parseInt(match[2], 10) : from;
    if (from < 1 || to > pageCount || from > to) {
      throw new Error(
        `"${chunk}" is out of range — this PDF has ${pageCount} page${pageCount === 1 ? '' : 's'}.`
      );
    }
    for (let p = from; p <= to; p++) indices.add(p - 1);
  }
  return [...indices].sort((a, b) => a - b);
}

export async function zipFiles(
  entries: { name: string; data: Uint8Array }[]
): Promise<Uint8Array> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const entry of entries) zip.file(entry.name, entry.data);
  return zip.generateAsync({ type: 'uint8array' });
}

export function downloadBytes(
  bytes: Uint8Array,
  filename: string,
  mime = 'application/pdf'
): void {
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  // Anchored in the DOM and revoked a tick later: revoking immediately aborts the transfer in Safari and can truncate large files.
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 10_000);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
