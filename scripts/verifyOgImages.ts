/**
 * Verifies that prerendered og:image and preload URLs actually resolve.
 *
 * A broken og:image is invisible in normal use but silently kills every link
 * preview, so it is worth checking against the real CDN rather than assuming
 * the URL construction is right.
 *
 * Run: npx tsx scripts/verifyOgImages.ts
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist', 'equipment');
// Wikimedia throttles bulk requests hard: at ~3/s the CDN returns 429 for
// most of the run, which reads as a wall of failures when nothing is wrong.
// Fewer entries, spaced further apart, is the difference between a usable
// check and noise.
const SAMPLE = 12;
// Browser-like UA: Wikimedia rejects script agents for image requests.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

// Flat `<slug>.html` files, per the note in scripts/prerender.ts. readdir
// returns them with the extension, which the read below adds again.
const slugs = (await readdir(DIST))
  .filter((name) => name.endsWith('.html'))
  .map((name) => name.replace(/\.html$/, ''));
const step = Math.max(1, Math.floor(slugs.length / SAMPLE));
const sampled = slugs.filter((_, index) => index % step === 0).slice(0, SAMPLE);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wikimedia rate-limits bursts to 429. Without a delay and a retry the check
 * reports healthy URLs as broken, which is worse than not checking at all.
 */
async function head(url: string): Promise<{ ok: boolean; status: number; type: string }> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status !== 429) {
      return {
        ok: res.ok,
        status: res.status,
        type: res.headers.get('content-type') ?? '',
      };
    }
    await sleep(1500 * 2 ** attempt);
  }
  return { ok: false, status: 429, type: '' };
}

let ok = 0;
const failures: string[] = [];

for (const slug of sampled) {
  // scripts/prerender.ts writes flat files — `equipment/ak-47.html`, not
  // `equipment/ak-47/index.html` — so that the canonical un-slashed URL is
  // served without a redirect hop. This read assumed the directory-index form
  // and had been failing on the first entry ever since.
  const html = await readFile(join(DIST, `${slug}.html`), 'utf8');
  const urls = [
    /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1],
    /<link rel="preload" as="image" href="([^"]+)"/.exec(html)?.[1],
  ].filter((url): url is string => Boolean(url) && url.startsWith('http'));

  for (const url of urls) {
    const decoded = url.replace(/&amp;/g, '&');
    try {
      const res = await head(decoded);
      if (res.ok && res.type.startsWith('image/')) ok++;
      else failures.push(`${slug}: ${res.status} ${decoded.slice(0, 110)}`);
    } catch (error) {
      failures.push(`${slug}: ${(error as Error).message}`);
    }
    await sleep(1400);
  }
}

console.log(`${ok} ok, ${failures.length} failed (${sampled.length} entries sampled)`);
for (const failure of failures.slice(0, 10)) console.log(`  ${failure}`);
if (failures.length > 0) process.exitCode = 1;
