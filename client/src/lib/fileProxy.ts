/**
 * Build a URL that routes a Cloudinary file through our backend proxy.
 *
 * Cloudinary's `raw` storage class (used for PDFs / docs / archives) serves
 * every asset with `Content-Type: application/octet-stream`, which forces
 * browsers to download the file as an unnamed binary blob — the exact
 * "corrupted file" symptom resume downloads exhibited. The proxy at
 * `/api/upload/proxy` re-fetches the file and re-streams it with the right
 * Content-Type and a sensible Content-Disposition, so PDFs open in the
 * browser's built-in viewer and downloads keep their original filename.
 *
 * Strategy adopted from RDSWA. Use this helper everywhere a Cloudinary
 * attachment URL is rendered as an `<a href>` or `window.open()` target.
 *
 * @param rawUrl  The Cloudinary `secure_url` returned from the upload API
 * @param name    Optional filename hint — surfaces in the download dialog
 * @param inline  `true` (default) → preview in browser; `false` → force download
 */
const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  'http://localhost:5000/api';

export function proxyFileUrl(
  rawUrl: string,
  name?: string,
  inline = true
): string {
  if (!rawUrl) return '';
  // Non-Cloudinary URLs (e.g. external links) pass through untouched — the
  // proxy rejects them anyway as an SSRF guard.
  if (!rawUrl.includes('res.cloudinary.com')) return rawUrl;
  const params = new URLSearchParams({ url: rawUrl, inline: String(inline) });
  if (name) params.set('name', name);
  return `${API_BASE}/upload/proxy?${params.toString()}`;
}
