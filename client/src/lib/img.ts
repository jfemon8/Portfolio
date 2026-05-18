/**
 * Cloudinary delivery optimizer (project rule #3/#5/#8). All portfolio media
 * is Cloudinary-hosted but stored as raw upload URLs; rewriting them with
 * `f_auto,q_auto,c_limit,w_*` cuts image bytes dramatically (modern formats,
 * auto quality, never upscaled) with zero visual change.
 *
 * Non-Cloudinary or already-transformed URLs pass through untouched, so this
 * is safe as a blanket wrapper.
 */
export function cldUrl(src: string, width = 1600): string {
  if (
    !src ||
    !src.includes('res.cloudinary.com') ||
    !src.includes('/upload/') ||
    src.includes('/upload/f_auto')
  ) {
    return src;
  }
  const transform = `f_auto,q_auto,c_limit,w_${width}`;
  return src.replace('/upload/', `/upload/${transform}/`);
}
