/**
 * Wikimedia image helpers.
 *
 * Commons exposes a thumbnailing service through a URL convention rather than
 * an API, which is what makes the hotlink strategy viable: we can request an
 * exactly-sized rendition of any file without hosting or transcoding it.
 *
 *   original  .../commons/a/ab/Foo.jpg
 *   thumbnail .../commons/thumb/a/ab/Foo.jpg/800px-Foo.jpg
 *
 * Requesting a size Commons has already rendered is a CDN hit; the service
 * worker then caches it for 30 days.
 */

/**
 * Wikimedia's pre-rendered thumbnail buckets.
 *
 * These specific widths are NOT arbitrary. Commons no longer renders
 * thumbnails on demand for hotlinked requests — verified in-browser, widths
 * 320/640/800 return HTTP 400 ("please honor our robot policy") on every file
 * tested, while 500/960/1280/1920 succeed on every file tested. Requesting a
 * width outside this set yields a broken image, so the responsive ladder must
 * snap to it.
 *
 * If a size outside these buckets is ever needed, resolve it through the
 * MediaWiki API's `iiurlwidth` parameter at seed time and store the returned
 * `thumburl`, rather than constructing the URL here.
 */
const WIDTHS = [330, 500, 960, 1280, 1920] as const;

/**
 * Largest rendition a full-bleed hero may request.
 *
 * Defined here rather than in the page component because the prerenderer emits
 * the matching `<link rel="preload">` and `og:image`, and a preload that
 * resolves to a different rendition than the `<img>` is two downloads with the
 * LCP arriving late. One definition, imported by both.
 *
 * Raised from 1280 once measured: 62% of heroes have sources at or above
 * 1920px (median 2250), so a 1280 cap was serving a 2.2x upscale to any
 * viewport wider than ~1400 at DPR 2. The cap originally guarded against
 * multi-megabyte transparent PNGs, but heroes are 88% JPEG and only 29 PNGs
 * exceed 1920 — it was penalising 270 photographs to protect 29 files.
 * Narrow viewports are unaffected: `sizes="100vw"` still selects 500 or 960
 * from the srcset.
 */
export const HERO_MAX_WIDTH = 1920;

/**
 * Whether an image can be cropped to fill a landscape frame, or has to be
 * letterboxed inside it.
 *
 * `object-cover` scales to fill and crops the overflow, which is right for an
 * ordinary photograph and destructive for anything shaped very differently
 * from the frame. Measured across the corpus: 37 heroes are wider than 2.4:1
 * and 63 are square or portrait. The worst is the M14 at 7888x1732 — cover in
 * a 1440x800 hero shows 40% of its width, cropping off both the muzzle and the
 * buttstock. Side-on rifle photography is exactly the shape this breaks, and
 * exactly what people open these pages to see.
 *
 * The band is deliberately generous. Cropping a little is normal and looks
 * intentional; the letterbox treatment is reserved for images that would
 * otherwise lose their subject.
 *
 * Heroes only. It was tried on cards and looked worse: in a 16:10 tile a 3:1
 * rifle becomes a thin band adrift in dead space and a portrait shot becomes a
 * narrow strip, so a grid of mixed ratios reads ragged. Cards crop.
 */
export function heroFit(width?: number, height?: number): 'cover' | 'contain' {
  if (!width || !height) return 'cover';
  const ratio = width / height;
  return ratio > 2.2 || ratio < 1.2 ? 'contain' : 'cover';
}

/** Already-thumbnailed URLs carry `/thumb/` and a `NNNpx-` filename prefix. */
const THUMB_PATTERN = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+)\/thumb\/(.+?)\/\d+px-(.+)$/;
const ORIGINAL_PATTERN = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+)\/([0-9a-f]\/[0-9a-f]{2}\/)(.+)$/;

/** Build a thumbnail URL at `width`, or null if the URL isn't thumbnailable. */
export function wikimediaThumb(url: string, width: number): string | null {
  const thumbMatch = THUMB_PATTERN.exec(url);
  if (thumbMatch) {
    const [, base, path, filename] = thumbMatch;
    return `${base}/thumb/${path}/${width}px-${filename}`;
  }

  const originalMatch = ORIGINAL_PATTERN.exec(url);
  if (originalMatch) {
    const [, base, shard, filename] = originalMatch;
    // SVG and some formats render to PNG; Commons appends the extension.
    const rendered = /\.svg$/i.test(filename ?? '') ? `${filename}.png` : filename;
    return `${base}/thumb/${shard}${filename}/${width}px-${rendered}`;
  }

  return null;
}

/**
 * Responsive `srcset`, capped at the image's intrinsic width so we never ask
 * Commons to upscale. Returns undefined for non-Wikimedia URLs.
 */
export function wikimediaSrcSet(url: string, intrinsicWidth?: number): string | undefined {
  if (!url.includes('upload.wikimedia.org')) return undefined;

  const candidates = WIDTHS.filter((w) => !intrinsicWidth || w <= intrinsicWidth);
  const entries = candidates
    .map((width) => {
      const thumb = wikimediaThumb(url, width);
      return thumb ? `${thumb} ${width}w` : null;
    })
    .filter((entry): entry is string => entry !== null);

  return entries.length ? entries.join(', ') : undefined;
}

/**
 * Single best-fit rendition, snapped to an available bucket.
 *
 * Pass `intrinsicWidth` whenever the source dimensions are known. Commons will
 * upscale on request, but doing so is pure waste: a 704px original served at
 * 1920px is a larger file carrying no extra detail, and because that rendition
 * is unlikely to be cached it is also the slowest to return and the first to
 * be throttled. Many entries have modest heroes (the MAC-10's is 704px, the M1
 * helmet's 528px), so the clamp matters more often than it looks.
 *
 * When the source is smaller than the smallest bucket, the original URL is
 * returned unchanged; originals always resolve.
 */
export function sizedImage(url: string, width: number, intrinsicWidth?: number): string {
  const available = intrinsicWidth ? WIDTHS.filter((w) => w <= intrinsicWidth) : WIDTHS;
  if (available.length === 0) return url;

  const bucket = available.find((w) => w >= width) ?? available[available.length - 1];
  return wikimediaThumb(url, bucket as number) ?? url;
}
