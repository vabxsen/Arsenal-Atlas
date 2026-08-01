import { useState, type CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import { wikimediaSrcSet } from '@shared/images';

interface SmartImageProps {
  src: string;
  alt: string;
  width?: number | undefined;
  height?: number | undefined;
  className?: string;
  /** Only the LCP image should set this. Everything else stays lazy. */
  priority?: boolean;
  sizes?: string;
  /** Renders the image to fill its positioned parent. */
  fill?: boolean;
  /**
   * Source width. Caps the generated srcset so Commons is never asked to
   * upscale — see the note in shared/images.ts.
   */
  intrinsicWidth?: number | undefined;
}

/**
 * The only <img> in the product.
 *
 * Three jobs, all of which the spec depends on:
 *   - responsive `srcset` derived from Wikimedia's thumbnail service, so a
 *     phone never downloads a 6612px hero
 *   - an `aspect-ratio` box reserved from the intrinsic dimensions, which is
 *     what keeps CLS at zero
 *   - a fade-in on decode, so images arrive rather than snapping in
 */
export function SmartImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes = '100vw',
  fill = false,
  intrinsicWidth,
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const srcSet = wikimediaSrcSet(src, intrinsicWidth ?? width);

  // Reserve the exact box before the bytes arrive.
  const style: CSSProperties =
    !fill && width && height ? { aspectRatio: `${width} / ${height}` } : {};

  if (failed) {
    return (
      <div
        className={cn('grid place-items-center bg-base text-fg-tertiary', className)}
        style={style}
        role="img"
        aria-label={`${alt} (image unavailable)`}
      >
        <span className="text-caption">Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      {...(srcSet ? { srcSet, sizes } : {})}
      alt={alt}
      {...(width ? { width } : {})}
      {...(height ? { height } : {})}
      loading={priority ? 'eager' : 'lazy'}
      // fetchPriority high on the hero measurably improves LCP; everything
      // else must not compete with it.
      fetchPriority={priority ? 'high' : 'auto'}
      decoding={priority ? 'sync' : 'async'}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      style={style}
      className={cn(
        'transition-opacity duration-700 ease-(--ease-out-expo)',
        loaded ? 'opacity-100' : 'opacity-0',
        fill && 'absolute inset-0 h-full w-full object-cover',
        className
      )}
    />
  );
}
