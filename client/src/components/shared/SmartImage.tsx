import type { ImgHTMLAttributes } from 'react';
import { cldUrl } from '@/lib/img';

/**
 * The single optimized image element (project rule #3). Drop-in for `<img>`:
 * keeps the caller's exact markup/classes (no layout/CLS change) while adding
 * Cloudinary optimization, async decoding and the right loading priority.
 *
 * `priority` = above-the-fold hero/cover → eager + high fetch priority for a
 * better LCP. Everything else stays lazy.
 */
interface SmartImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'loading'
> {
  src: string;
  alt: string;
  priority?: boolean;
  /** Target render width (px) for the Cloudinary transform. */
  imgWidth?: number;
}

export default function SmartImage({
  src,
  alt,
  priority = false,
  imgWidth = 1280,
  ...rest
}: SmartImageProps) {
  return (
    <img
      src={cldUrl(src, imgWidth)}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      {...rest}
    />
  );
}
