import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ListingEntry } from '@shared/listing';
import type { Equipment, Family, SearchIndex } from '@shared/schema';

/**
 * Content data access.
 *
 * Reads the build-time static export produced by `npm run seed`. Firestore
 * remains the system of record and the admin write target, but content pages
 * read these files: each is a single cached CDN request, costs nothing to
 * serve, and works offline through the service worker.
 *
 * `listing.json` is the light projection (no prose, no galleries) that grids
 * and rails need; full documents are fetched per-slug only when a detail page
 * actually opens.
 */

/**
 * Re-exported rather than declared. The seed writes this exact shape, so the
 * definition lives in shared/ where both sides read it — see shared/listing.ts.
 */
export type { ListingEntry };

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return (await res.json()) as T;
}

/** Content is immutable between deploys, so it never needs refetching. */
const STATIC = {
  staleTime: Infinity,
  gcTime: Infinity,
  retry: 1,
} as const;

export function useListing(): UseQueryResult<ListingEntry[]> {
  return useQuery({
    queryKey: ['listing'],
    queryFn: () => getJson<ListingEntry[]>('/data/listing.json'),
    ...STATIC,
  });
}

export function useEquipment(slug: string | undefined): UseQueryResult<Equipment> {
  return useQuery({
    queryKey: ['equipment', slug],
    queryFn: () => getJson<Equipment>(`/data/equipment/${slug}.json`),
    enabled: Boolean(slug),
    ...STATIC,
  });
}

export function useFamilies(): UseQueryResult<Family[]> {
  return useQuery({
    queryKey: ['families'],
    queryFn: () => getJson<Family[]>('/data/families.json'),
    ...STATIC,
  });
}

export function useSearchIndex(): UseQueryResult<SearchIndex> {
  return useQuery({
    queryKey: ['search-index'],
    queryFn: () => getJson<SearchIndex>('/search-index.json'),
    ...STATIC,
  });
}

// ── Derivations over the listing ──────────────────────────────

export function byCategory(entries: ListingEntry[], category: string): ListingEntry[] {
  return entries
    .filter((entry) => entry.category === category)
    .sort((a, b) => b.popularity - a.popularity);
}

export function featured(entries: ListingEntry[], limit = 12): ListingEntry[] {
  return entries
    .filter((entry) => entry.featured && entry.hero)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
}

export function newest(entries: ListingEntry[], limit = 12): ListingEntry[] {
  return [...entries]
    .filter((entry) => entry.serviceStart !== undefined && entry.hero)
    .sort((a, b) => (b.serviceStart ?? 0) - (a.serviceStart ?? 0))
    .slice(0, limit);
}

export function popular(entries: ListingEntry[], limit = 12): ListingEntry[] {
  return [...entries]
    .filter((entry) => entry.hero)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
}

/**
 * Deterministic per-day sample, so "Random Equipment" is stable within a
 * session and across a reload but still changes daily.
 */
export function randomDaily(entries: ListingEntry[], limit = 6): ListingEntry[] {
  const withImages = entries.filter((entry) => entry.hero);
  if (withImages.length === 0) return [];

  const day = Math.floor(Date.now() / 86_400_000);
  const picked: ListingEntry[] = [];
  const seen = new Set<number>();

  // Linear congruential step keeps the walk spread out rather than clustered.
  let cursor = day % withImages.length;
  while (picked.length < Math.min(limit, withImages.length)) {
    cursor = (cursor * 1103515245 + 12345 + picked.length * 7919) % withImages.length;
    const index = Math.abs(cursor);
    if (seen.has(index)) {
      cursor = (index + 1) % withImages.length;
      continue;
    }
    seen.add(index);
    const entry = withImages[index];
    if (entry) picked.push(entry);
  }
  return picked;
}

export function countryCounts(entries: ListingEntry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const country of entry.countries) {
      if (!country.iso3) continue;
      counts.set(country.iso3, (counts.get(country.iso3) ?? 0) + 1);
    }
  }
  return counts;
}
