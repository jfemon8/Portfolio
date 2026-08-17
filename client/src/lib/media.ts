/** True when a media URL points at a PDF (vs. an image). Used to pick the right viewer — PdfPreviewModal for PDFs, Lightbox for images — and the right upload preview. Matches a `.pdf` extension, tolerating a query string (e.g. Cloudinary `?…`). */
export function isPdfUrl(url: string): boolean {
  return /\.pdf(?:$|\?)/i.test(url);
}
