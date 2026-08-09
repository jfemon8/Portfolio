// Cloudinary delivery optimizer — rewrites upload URLs with f_auto,q_auto,c_limit,w_* to cut bytes with no visual change; other URLs pass through untouched.
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
