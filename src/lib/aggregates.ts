import { CATEGORIES } from '@shared/taxonomy';
import type { ListingEntry } from './data';

/**
 * Corpus aggregates, computed once from the listing projection.
 *
 * These existed already, several times over and not always agreeing.
 * By-category was implemented three times (BrowsePage, prerender, the admin
 * overview) and by-decade twice — TimelinePage bucketed everything after 1800,
 * TimelinePreview everything after 1850, so the homepage histogram and the
 * timeline page were quietly describing different corpora.
 *
 * One definition each, here, and the year floor is stated once below.
 *
 * Everything is a pure function over ListingEntry[]. No components, so this
 * file is safe under `react-refresh/only-export-components`, and no fetching,
 * so callers keep control of when the listing is loaded.
 */

/**
 * Entries before this are catalogued but not plotted.
 *
 * The corpus reaches back to 1862, and a single 1860s entry stretches a decade
 * axis across a century of near-empty buckets to show one dot. 1850 keeps every
 * real entry (the earliest is 1862) while stating the intent — the histogram is
 * about the industrial era, not about the whole record.
 */
export const DECADE_FLOOR = 1850;

export function categoryCounts(entries: readonly ListingEntry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
  }
  return counts;
}

export function kindCounts(entries: readonly ListingEntry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.kind, (counts.get(entry.kind) ?? 0) + 1);
  }
  return counts;
}

export interface DecadeBucket {
  /** The decade's first year — 1970 for the 1970s. */
  decade: number;
  entries: ListingEntry[];
}

/**
 * Entries grouped by decade of entry into service, oldest first.
 *
 * Only the 359 of 482 entries carrying a `serviceStart` appear. That gap is
 * the reason nothing in the UI should present a decade view as a complete
 * picture of the corpus — a quarter of it has no year to plot.
 */
export function decadeBuckets(entries: readonly ListingEntry[]): DecadeBucket[] {
  const byDecade = new Map<number, ListingEntry[]>();
  for (const entry of entries) {
    const year = entry.serviceStart;
    if (year === undefined || year < DECADE_FLOOR) continue;
    const decade = Math.floor(year / 10) * 10;
    const bucket = byDecade.get(decade);
    if (bucket) bucket.push(entry);
    else byDecade.set(decade, [entry]);
  }
  return [...byDecade.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([decade, list]) => ({ decade, entries: list }));
}

export interface CorpusStats {
  entries: number;
  /** Distinct ISO3 codes among countries of *origin*, not operators. */
  countries: number;
  /** Taxonomy categories with at least one entry. */
  categories: number;
  /** Span from earliest to latest year of service, in years. */
  years: number;
  earliest: number;
  latest: number;
}

/**
 * The figures behind the homepage counters.
 *
 * Derived rather than written down, so they cannot go stale the way the
 * hard-coded "44 categories" in BrowsePage did. `categories` counts categories
 * *in use* rather than CATEGORIES.length: they happen to be equal today at 44,
 * and if a category ever empties, the honest number is the smaller one.
 */
export function corpusStats(entries: readonly ListingEntry[]): CorpusStats {
  const countries = new Set<string>();
  const categories = new Set<string>();
  let earliest = Infinity;
  let latest = -Infinity;

  for (const entry of entries) {
    categories.add(entry.category);
    for (const country of entry.countries) {
      if (country.iso3) countries.add(country.iso3);
    }
    const year = entry.serviceStart;
    if (year !== undefined) {
      if (year < earliest) earliest = year;
      if (year > latest) latest = year;
    }
  }

  const known = Number.isFinite(earliest) && Number.isFinite(latest);
  return {
    entries: entries.length,
    countries: countries.size,
    categories: Math.min(categories.size, CATEGORIES.length),
    years: known ? latest - earliest : 0,
    earliest: known ? earliest : 0,
    latest: known ? latest : 0,
  };
}
