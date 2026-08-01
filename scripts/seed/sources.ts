import { fetchJson } from '../lib/http.ts';
import { collectInfoboxParams, splitSections } from '../lib/wikitext.ts';

/**
 * Wikimedia source adapters.
 *
 * Three endpoints per article, each doing one job:
 *   REST summary  -> lead paragraph, description, hero image, QID, revision
 *   action=parse  -> raw wikitext for infobox extraction
 *   prop=extracts -> full plaintext, split into sections for history/development
 *   generator=images -> gallery candidates with per-file licence metadata
 *
 * `redirects=1` everywhere: most recognisable names are redirects to a
 * canonical title, and without it the API silently returns nothing.
 */

const API = 'https://en.wikipedia.org/w/api.php';
const REST = 'https://en.wikipedia.org/api/rest_v1';

export interface ArticleSummary {
  title: string;
  description?: string;
  extract: string;
  qid?: string;
  pageId: number;
  revisionId?: number;
  canonicalUrl: string;
  hero?: { url: string; width: number; height: number };
  thumb?: string;
}

interface RestSummary {
  type?: string;
  title?: string;
  description?: string;
  extract?: string;
  pageid?: number;
  revision?: string;
  wikibase_item?: string;
  content_urls?: { desktop?: { page?: string } };
  originalimage?: { source: string; width: number; height: number };
  thumbnail?: { source: string };
}

/** Thrown when an article genuinely cannot be used, as opposed to a transport failure. */
export class ArticleUnusableError extends Error {}

export async function fetchSummary(title: string): Promise<ArticleSummary | null> {
  const url = `${REST}/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;

  // Deliberately not caught: a network or rate-limit failure must surface as
  // an error rather than being reported as "no article", which previously
  // masked transient failures and made the run look like a catalogue problem.
  const data = await fetchJson<RestSummary>(url);

  if (!data.title) throw new ArticleUnusableError('no article');
  if (data.type === 'disambiguation') throw new ArticleUnusableError('disambiguation page');
  if (!data.extract) throw new ArticleUnusableError('article has no extract');

  const summary: ArticleSummary = {
    title: data.title,
    extract: data.extract,
    pageId: data.pageid ?? 0,
    canonicalUrl:
      data.content_urls?.desktop?.page ??
      `https://en.wikipedia.org/wiki/${encodeURIComponent(data.title.replace(/ /g, '_'))}`,
  };
  if (data.description) summary.description = data.description;
  if (data.wikibase_item) summary.qid = data.wikibase_item;
  if (data.revision) summary.revisionId = Number.parseInt(data.revision, 10);
  if (data.originalimage) {
    summary.hero = {
      url: data.originalimage.source,
      width: data.originalimage.width,
      height: data.originalimage.height,
    };
  }
  if (data.thumbnail) summary.thumb = data.thumbnail.source;
  return summary;
}

interface ParseResponse {
  parse?: { wikitext?: string };
}

/** Merged infobox parameters for an article. */
export async function fetchInfobox(title: string): Promise<Record<string, string>> {
  const url =
    `${API}?action=parse&page=${encodeURIComponent(title)}` +
    `&prop=wikitext&format=json&formatversion=2&redirects=1`;
  try {
    const data = await fetchJson<ParseResponse>(url);
    return collectInfoboxParams(data.parse?.wikitext ?? '');
  } catch {
    return {};
  }
}

interface ExtractResponse {
  query?: { pages?: { extract?: string }[] };
}

/** Full plaintext article, split into `heading -> body`. */
export async function fetchSections(title: string): Promise<Map<string, string>> {
  const url =
    `${API}?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(title)}` +
    `&format=json&formatversion=2&redirects=1`;
  try {
    const data = await fetchJson<ExtractResponse>(url);
    return splitSections(data.query?.pages?.[0]?.extract ?? '');
  } catch {
    return new Map();
  }
}

interface RedirectsResponse {
  query?: { pages?: { redirects?: { title: string; ns: number }[] }[] };
}

/** Redirect titles that are navigation artefacts rather than real names. */
const BAD_ALIAS = /^(list of|index of|outline of|talk:|category:|template:|draft:)/i;

/**
 * Alternate names for an article, taken from the pages that redirect to it.
 *
 * This is the highest-value alias source available: a redirect exists precisely
 * because a reader might search that term. It is what makes "kalash" find the
 * AK-47 and "Warthog" find the A-10 — names that appear nowhere in the
 * article title or infobox.
 */
export async function fetchAliases(title: string, limit = 24): Promise<string[]> {
  const url =
    `${API}?action=query&prop=redirects&titles=${encodeURIComponent(title)}` +
    `&rdlimit=100&rdnamespace=0&format=json&formatversion=2&redirects=1`;

  let data: RedirectsResponse;
  try {
    data = await fetchJson<RedirectsResponse>(url);
  } catch {
    return [];
  }

  const seen = new Set<string>([title.toLowerCase()]);
  const aliases: string[] = [];

  for (const redirect of data.query?.pages?.[0]?.redirects ?? []) {
    const name = redirect.title.trim();
    if (name.length < 2 || name.length > 60) continue;
    if (BAD_ALIAS.test(name)) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    aliases.push(name);
    if (aliases.length >= limit) break;
  }

  // Shortest first: "Kalashnikov" is a more useful search token than
  // "Avtomat Kalashnikova obraztsa 1947 goda".
  return aliases.sort((a, b) => a.length - b.length);
}

export interface GalleryImage {
  url: string;
  descriptionUrl: string;
  width: number;
  height: number;
  license: string;
  licenseUrl?: string;
  attribution?: string;
  caption?: string;
}

interface ImagesResponse {
  query?: {
    pages?: {
      title: string;
      imageinfo?: {
        url: string;
        descriptionurl: string;
        width: number;
        height: number;
        mime: string;
        extmetadata?: Record<string, { value?: string }>;
      }[];
    }[];
  };
}

/** Chrome, not content: icons, flags, badges, and UI furniture. */
const EXCLUDED_FILENAME = /flag|icon|logo|symbol|ambox|commons-|wiki|edit-|question|arrow|barnstar|padlock|stub|portal|emblem|coat of arms|seal|insignia|roundel|map of|location/i;

/**
 * Commons `LicenseUrl` is free text and is frequently malformed (protocol-
 * relative, bare domain, or prose). Drop anything that isn't a real absolute
 * URL — an unusable link must never cost us the whole entry at validation.
 */
function safeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const candidate = value.trim().startsWith('//') ? `https:${value.trim()}` : value.trim();
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Gallery candidates for an article, filtered to real photographs and carrying
 * the licence and author needed for attribution.
 */
export async function fetchGallery(title: string, limit = 24): Promise<GalleryImage[]> {
  const url =
    `${API}?action=query&generator=images&titles=${encodeURIComponent(title)}` +
    `&gimlimit=60&prop=imageinfo&iiprop=url%7Csize%7Cmime%7Cextmetadata` +
    `&format=json&formatversion=2&redirects=1`;

  let data: ImagesResponse;
  try {
    data = await fetchJson<ImagesResponse>(url);
  } catch {
    return [];
  }

  const images: GalleryImage[] = [];
  for (const page of data.query?.pages ?? []) {
    const info = page.imageinfo?.[0];
    if (!info) continue;

    // Photographs only. SVGs on these articles are near-universally diagrams,
    // flags, or icons rather than subject imagery.
    if (!info.mime?.startsWith('image/') || info.mime === 'image/svg+xml') continue;
    if (info.width < 480 || info.height < 320) continue;
    if (EXCLUDED_FILENAME.test(page.title)) continue;

    const meta = info.extmetadata ?? {};
    const license = stripHtml(meta.LicenseShortName?.value ?? meta.License?.value ?? '');
    // No licence statement means we cannot attribute it, so we don't ship it.
    if (!license) continue;

    const artist = stripHtml(meta.Artist?.value ?? meta.Credit?.value ?? '');
    const description = stripHtml(meta.ImageDescription?.value ?? '');

    const url = safeUrl(info.url);
    const descriptionUrl = safeUrl(info.descriptionurl);
    if (!url || !descriptionUrl) continue;

    const image: GalleryImage = {
      url,
      descriptionUrl,
      width: info.width,
      height: info.height,
      license,
    };
    const licenseUrl = safeUrl(meta.LicenseUrl?.value);
    if (licenseUrl) image.licenseUrl = licenseUrl;
    if (artist) image.attribution = artist.slice(0, 200);
    if (description) image.caption = description.slice(0, 300);

    images.push(image);
  }

  // Largest first — the biggest images are almost always the subject photos.
  images.sort((a, b) => b.width * b.height - a.width * a.height);
  return images.slice(0, limit);
}
