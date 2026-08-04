import { slugify } from './derive.ts';

/**
 * The conflict index.
 *
 * 1,782 conflict references sit across 234 of the 482 entries and, until now,
 * rendered only as plain unlinked chips at the bottom of a detail page. It is
 * the largest relational dataset in the corpus and the only one with no way in.
 *
 * Nothing in `conflicts[]` carries a slug — the seed extracts names from
 * infobox "Used in" fields — so identity has to be derived, and derived
 * identity means near-duplicates. Hence the alias table below.
 *
 * Imports `slugify` from derive.ts, whose only value import is `getCategory`
 * from taxonomy.ts, so nothing here drags zod into the browser bundle.
 */

/**
 * Names that slugify apart but mean the same campaign.
 *
 * Every pair here was verified against the corpus rather than guessed; the
 * counts are the entries affected at the time of writing.
 *
 * What is deliberately NOT merged matters as much. `war-in-afghanistan` (71)
 * and `soviet-afghan-war` (31) are different wars a generation apart, and
 * collapsing them because both say "Afghan" would silently merge the Cold War
 * into the war on terror. When in doubt, leave two entries: a duplicate in the
 * index is a cosmetic flaw, a bad merge is a factual claim.
 */
const CONFLICT_ALIASES: Record<string, string> = {
  'war-in-iraq': 'iraq-war', //                     24 -> 62
  'persian-gulf-war': 'gulf-war', //                13 -> 40
  'operation-desert-storm': 'gulf-war', //           1 -> 40  (its combat phase)
  'first-world-war': 'world-war-i', //               2 -> 15
  'second-world-war': 'world-war-ii', //             5 -> 49
  'russian-invasion-of-ukraine': 'russo-ukrainian-war', // 27 -> 62 (a phase of it)
  // Not a conflict name at all — a service period ("World War I–present") that
  // the infobox parser picked up from the wrong field.
  'world-war-i-present': 'world-war-i',
};

/** Stable identity for a conflict name. */
export function conflictSlug(name: string): string {
  const base = slugify(name);
  return CONFLICT_ALIASES[base] ?? base;
}

export interface ConflictSummary {
  slug: string;
  /** The most frequent surface form among the names that map to this slug. */
  name: string;
  count: number;
  /** Equipment slugs, most popular first. */
  entries: string[];
}

interface ConflictSource {
  slug: string;
  popularity: number;
  conflicts: readonly { name: string }[];
}

/**
 * Builds the index, most-referenced first.
 *
 * The display name is the most common spelling rather than the first seen, so
 * a slug reached by 62 entries titled "Iraq War" and 24 titled "War in Iraq"
 * presents as the former. Ties break alphabetically to keep the build
 * deterministic — otherwise the emitted JSON would churn between seeds and
 * every reseed would look like a content change.
 */
export function buildConflictIndex(source: readonly ConflictSource[]): ConflictSummary[] {
  interface Bucket {
    names: Map<string, number>;
    entries: ConflictSource[];
  }
  const byslug = new Map<string, Bucket>();

  for (const entry of source) {
    // An entry citing both "Iraq War" and "War in Iraq" must count once.
    const seen = new Set<string>();
    for (const conflict of entry.conflicts) {
      const slug = conflictSlug(conflict.name);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);

      const bucket: Bucket = byslug.get(slug) ?? { names: new Map(), entries: [] };
      bucket.names.set(conflict.name, (bucket.names.get(conflict.name) ?? 0) + 1);
      bucket.entries.push(entry);
      byslug.set(slug, bucket);
    }
  }

  return [...byslug.entries()]
    .map(([slug, { names, entries }]) => ({
      slug,
      name: [...names.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]![0],
      count: entries.length,
      entries: [...entries]
        .sort((a, b) => b.popularity - a.popularity)
        .map((entry) => entry.slug),
    }))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
}

/**
 * Conflicts thin enough to leave off the sitemap.
 *
 * 222 of 413 are cited by a single entry. A generated page for each would be
 * a heading, one card, and nothing else — thin content that dilutes the index
 * without helping anyone. They stay reachable through the SPA and set their
 * metadata at runtime; they just do not get a prerendered shell.
 */
export const CONFLICT_PRERENDER_MIN = 2;
