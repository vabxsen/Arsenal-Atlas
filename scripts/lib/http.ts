import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Polite, cached HTTP for the seed pipeline.
 *
 * Every response is written to `.cache/` keyed by URL hash, so a re-run costs
 * nothing and iterating on the normaliser never re-hits Wikimedia. Requests
 * are serialised with a delay because the pipeline is a batch job — there is
 * no reason to burst against a donated API.
 */

const CACHE_DIR = join(process.cwd(), '.cache', 'http');

/** Wikimedia's User-Agent policy requires a descriptive, contactable UA. */
const USER_AGENT =
  process.env.SEED_USER_AGENT ??
  'ArsenalAtlas/0.1 (https://github.com/arsenal-atlas; seed-pipeline) node-fetch';

const MIN_INTERVAL_MS = 120;
let lastRequestAt = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cachePath(url: string): string {
  const hash = createHash('sha256').update(url).digest('hex');
  // Shard by first byte so no single directory holds thousands of files.
  return join(CACHE_DIR, hash.slice(0, 2), `${hash}.json`);
}

async function readCache(url: string): Promise<string | null> {
  try {
    return await readFile(cachePath(url), 'utf8');
  } catch {
    return null;
  }
}

async function writeCache(url: string, body: string): Promise<void> {
  const path = cachePath(url);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body, 'utf8');
}

export interface FetchOptions {
  /** Bypass the disk cache for this request. */
  fresh?: boolean;
  retries?: number;
}

/** Fetch a URL as text, with disk cache, throttling, and backoff. */
export async function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
  const { fresh = false, retries = 3 } = options;

  if (!fresh) {
    const cached = await readCache(url);
    if (cached !== null) return cached;
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, 'Accept-Encoding': 'gzip' },
      });

      // 429/5xx are transient; back off exponentially and retry.
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      if (!res.ok) {
        // 404s are a data problem, not a transport problem — fail fast so the
        // caller can decide whether the entry is skippable.
        throw Object.assign(new Error(`HTTP ${res.status} for ${url}`), { fatal: true });
      }

      const body = await res.text();
      await writeCache(url, body);
      return body;
    } catch (error) {
      lastError = error;
      if ((error as { fatal?: boolean }).fatal) throw error;
      if (attempt < retries) await sleep(2 ** attempt * 500);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`);
}

export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const text = await fetchText(url, options);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Malformed JSON from ${url}`);
  }
}

/**
 * Map over items with bounded concurrency.
 * The throttle above still serialises the actual network calls; this exists so
 * parsing and cache hits overlap rather than running strictly one at a time.
 */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index] as T, index);
    }
  });

  await Promise.all(workers);
  return results;
}
