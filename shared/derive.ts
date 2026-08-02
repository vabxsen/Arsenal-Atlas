import { getCategory } from './taxonomy.ts';
import type { Equipment } from './schema.ts';

/**
 * Derived-field reconstruction.
 *
 * `specIndex` and `countryCodes` are projections. `scripts/seed/normalize.ts`
 * computes them while it builds an entry, from the raw infobox parse — it is
 * the authoritative producer and stays that way.
 *
 * Anything that writes an entry by hand still has to keep them consistent, or
 * a changed operator list leaves the entry off the world map. This module is
 * what the admin editor uses to do that. The split below is not arbitrary:
 *
 *   - `countryCodes` and `kind` are *exactly* reconstructible from a finished
 *     document, and `scripts/lib/derive.test.ts` proves it across every
 *     seeded entry. They are recomputed on every save.
 *
 *   - `specIndex` is NOT. It is keyed on the field labels in
 *     `scripts/seed/specMap.ts`, and those are not recoverable from the
 *     stored items: "Thrust (Afterburner)" is a field label in its own right,
 *     while "Range (land)" is the field "Range" qualified by a value line.
 *     Nothing in the document distinguishes the two. So `withDerived` carries
 *     `specIndex` through untouched, and rebuilding it is an explicit,
 *     opt-in action — see `rebuildSpecIndex`.
 *
 * Guessing there would be worse than doing nothing: an approximate rebuild
 * silently rewrote the Compare data of 194 of the 482 seeded entries, with no
 * error anywhere, because both shapes are schema-valid.
 */

/**
 * Origin countries *and* operators, flattened to ISO3. Denormalised so the
 * country explorer can answer with one `array-contains` query instead of
 * reading the corpus and filtering client-side.
 */
export function deriveCountryCodes(
  countries: Equipment['countries'],
  operators: Equipment['operators']
): string[] {
  return [
    ...new Set(
      [...countries, ...operators]
        .map((country) => country.iso3)
        .filter((iso3): iso3 is string => Boolean(iso3))
    ),
  ];
}

/**
 * Recomputes the derived fields that can be recomputed safely.
 *
 * Deliberately a no-op on a seeded entry: opening one in the editor and
 * saving it untouched must not rewrite the document. The test asserts that.
 */
export function withDerived(entry: Equipment): Equipment {
  return {
    ...entry,
    countryCodes: deriveCountryCodes(entry.countries, entry.operators),
    // `kind` follows from the category — the taxonomy owns that mapping, and
    // letting the two drift would render the wrong spec groups on the detail
    // page.
    kind: getCategory(entry.category)?.kind ?? entry.kind,
  };
}

/**
 * Rebuilds `specIndex` from the stored specifications, keyed on item labels
 * verbatim, first value per label winning.
 *
 * An approximation, and offered to the admin as an explicit button rather
 * than run automatically — see the note above. It is the best available
 * answer after specifications are hand-edited, because the alternative is an
 * index that still describes the old values. On the next `npm run seed` the
 * pipeline regenerates the field authoritatively and this is overwritten.
 */
export function rebuildSpecIndex(
  specifications: Equipment['specifications']
): Record<string, number | string> {
  const specIndex: Record<string, number | string> = {};

  for (const group of specifications) {
    for (const item of group.items) {
      if (!(item.label in specIndex)) specIndex[item.label] = item.value;
    }
  }

  return specIndex;
}

/** Lowercases and hyphenates a name into a schema-legal slug. */
export function slugify(value: string): string {
  return (
    value
      .normalize('NFKD')
      // Strip the combining marks NFKD just split off. Without this they fall
      // through to the non-alphanumeric rule below and become hyphens, so an
      // accented name would slugify with a spurious word break in it.
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120)
  );
}
