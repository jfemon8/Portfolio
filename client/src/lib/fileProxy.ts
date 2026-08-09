// Cloudinary's raw storage class serves everything as octet-stream, forcing "corrupted file" downloads — this proxy re-streams with the correct Content-Type/Content-Disposition.
const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  'http://localhost:5000/api';

export function proxyFileUrl(
  rawUrl: string,
  name?: string,
  inline = true
): string {
  if (!rawUrl) return '';
  // Non-Cloudinary URLs pass through untouched — the proxy would reject them anyway as an SSRF guard.
  if (!rawUrl.includes('res.cloudinary.com')) return rawUrl;
  const params = new URLSearchParams({ url: rawUrl, inline: String(inline) });
  if (name) params.set('name', name);
  return `${API_BASE}/upload/proxy?${params.toString()}`;
}
