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
