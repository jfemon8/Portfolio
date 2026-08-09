import type { ImgHTMLAttributes } from 'react';
import { cldUrl } from '@/lib/img';

// Drop-in <img> with Cloudinary optimization and async decoding; priority=true is for above-the-fold hero/cover images to improve LCP, everything else stays lazy.
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
      // React 18 only recognizes lowercase fetchpriority (camelCase warns); only emit for priority images since auto is the default — drop this cast on React 19.
      {...(priority
        ? ({ fetchpriority: 'high' } as Record<string, string>)
        : {})}
      {...rest}
    />
  );
}
