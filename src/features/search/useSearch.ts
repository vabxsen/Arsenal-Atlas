import Fuse, { type IFuseOptions } from 'fuse.js';
import { useMemo } from 'react';
import { useSearchIndex } from '@/lib/data';
import type { SearchEntry } from '@shared/schema';

/**
 * Fuzzy search over the pre-built index.
 *
 * The entire corpus ships as one ~27 KB gzipped document, fetched once and
 * cached, so every keystroke is matched in memory — no network, no Firestore
 * reads, and no debounce needed for correctness.
 */

const FUSE_OPTIONS: IFuseOptions<SearchEntry> = {
  keys: [
    { name: 'name', weight: 0.5 },
    { name: 'aliases', weight: 0.3 },
    { name: 'category', weight: 0.1 },
    { name: 'country', weight: 0.1 },
  ],
  // 0.32 tolerates real typos ("kalashnakov") without letting unrelated
  // entries in. Above ~0.45 the results stop feeling intentional.
  threshold: 0.32,
  // Matches anywhere in the string: "Falcon" should find "F-16 Fighting Falcon".
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
};

export interface SearchResult {
  entry: SearchEntry;
  score: number;
}

export function useSearch(query: string, limit = 12) {
  const { data: index, isLoading } = useSearchIndex();

  const fuse = useMemo(() => {
    if (!index) return null;
    return new Fuse(index.entries, FUSE_OPTIONS);
  }, [index]);

  const results = useMemo<SearchResult[]>(() => {
    const trimmed = query.trim();
    if (!fuse || trimmed.length < 2) return [];

    return fuse
      .search(trimmed, { limit: limit * 2 })
      .map((hit) => ({ entry: hit.item, score: hit.score ?? 1 }))
      // Fuse ranks purely on textual distance. Nudging by popularity breaks
      // near-ties toward the better-known weapon, which is almost always
      // what the user meant.
      .sort((a, b) => a.score - b.score - (a.entry.popularity - b.entry.popularity) / 100_000)
      .slice(0, limit);
  }, [fuse, query, limit]);

  return { results, isLoading, ready: Boolean(fuse) };
}

/** Highest-popularity entries, used as the palette's resting state. */
export function usePopularEntries(limit = 6): SearchEntry[] {
  const { data: index } = useSearchIndex();
  return useMemo(() => (index ? index.entries.slice(0, limit) : []), [index, limit]);
}
