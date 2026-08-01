/**
 * The canonical public origin.
 *
 * Baked into canonical links, Open Graph URLs, the sitemap, and robots.txt —
 * so a mismatch between any two of those points crawlers at a domain that is
 * not the one being served. This constant is the single default; each consumer
 * applies its own environment override, because the browser reads
 * `import.meta.env` and the build scripts read `process.env`, and neither
 * expression type-checks under the other's tsconfig.
 *
 * Firebase serves this project on both `arsenalatlas.web.app` and
 * `arsenalatlas.firebaseapp.com`. Identical content on two hosts is duplicate
 * content; naming one here and emitting it as `rel="canonical"` everywhere is
 * what tells search engines which to index.
 */
export const DEFAULT_SITE_URL = 'https://arsenalatlas.firebaseapp.com';

/** Strips a trailing slash so callers can concatenate paths safely. */
export function normalizeOrigin(value: string | undefined): string {
  return (value && value.trim() ? value.trim() : DEFAULT_SITE_URL).replace(/\/$/, '');
}
