import { useCallback, useState, type CSSProperties } from 'react';
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
  /**
   * How the image sits in its box when `fill` is set.
   *
   * `contain` exists for subjects whose aspect ratio is nowhere near the
   * frame's. Cropping a 4.55:1 side-on rifle photograph to a 16:9 hero shows
   * the receiver and throws away the muzzle and the stock — see
   * `heroFit` in shared/images.ts.
   */
  fit?: 'cover' | 'contain';
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
  fit = 'cover',
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  /**
   * An image the browser already has decoded must not fade in again.
   *
   * `onLoad` does not fire for an image that completed before React attached
   * its handler, which is exactly the case on an equipment route: the head
   * preloads the hero and `scripts/prerender.ts` paints it as static markup,
   * so by the time React mounts the bytes are in cache. Without this the hero
   * would be visible, blink to transparent as React took over, and fade back
   * in over 700ms — slower-feeling than before the prerender existed.
   *
   * Ref callbacks run in the commit phase, so the resulting state update is
   * flushed before the browser paints and no transparent frame is shown.
   */
  const measureRef = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) setLoaded(true);
  }, []);

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
      ref={measureRef}
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
        fill && 'absolute inset-0 h-full w-full',
        fill && (fit === 'contain' ? 'object-contain' : 'object-cover'),
        className
      )}
    />
  );
}
