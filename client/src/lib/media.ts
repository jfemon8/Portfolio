/** True when a media URL points at a PDF rather than an image, matching a `.pdf` extension even with a query string, so callers can pick the right viewer and upload preview. */
export function isPdfUrl(url: string): boolean {
  return /\.pdf(?:$|\?)/i.test(url);
}
