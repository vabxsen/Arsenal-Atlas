/**
 * Verifies shared/derive.ts against the corpus scripts/seed/normalize.ts
 * actually produced.
 *
 * This is the contract behind hand-editing. normalize.ts computes the derived
 * fields while parsing raw infobox data; the admin editor only ever sees a
 * finished document. Where it recomputes a field, the result has to match the
 * pipeline exactly — otherwise saving an entry through the dashboard would
 * quietly corrupt Compare or the country map, with no error anywhere, because
 * both shapes are schema-valid.
 *
 * The last section is the important one: `withDerived` must be a no-op on a
 * seeded entry, so opening one in the editor and saving it untouched changes
 * nothing.
 *
 * Run: npx tsx scripts/lib/derive.test.ts   (needs `npm run seed` first)
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  deriveCountryCodes,
  rebuildSpecIndex,
  slugify,
  withDerived,
} from '../../shared/derive.ts';
import type { Equipment } from '../../shared/schema.ts';

const entries = JSON.parse(
  await readFile(join(process.cwd(), 'data', 'equipment.json'), 'utf8')
) as Equipment[];

let failures = 0;
const report = (label: string, detail: string) => {
  console.log(`FAIL  ${label}\n      ${detail}`);
  failures++;
};

// ── countryCodes is exactly reconstructible ───────────────────

for (const entry of entries) {
  const rebuilt = deriveCountryCodes(entry.countries, entry.operators);
  // Order is meaningful (origins first, then operators). An array-contains
  // query does not care, but a needless rewrite of every document would.
  if (rebuilt.join('|') !== entry.countryCodes.join('|')) {
    report(
      `${entry.slug}: countryCodes differ`,
      `stored [${entry.countryCodes.join(', ')}] rebuilt [${rebuilt.join(', ')}]`
    );
  }
}

// ── kind follows from category ────────────────────────────────

for (const entry of entries) {
  const { kind } = withDerived(entry);
  if (kind !== entry.kind) {
    report(`${entry.slug}: kind differs`, `stored ${entry.kind} derived ${kind}`);
  }
}

// ── withDerived is a no-op on a seeded entry ──────────────────

for (const entry of entries) {
  if (JSON.stringify(withDerived(entry)) !== JSON.stringify(entry)) {
    report(
      `${entry.slug}: withDerived is not idempotent`,
      'opening this entry and saving it untouched would rewrite the document'
    );
  }
}

// ── specIndex is carried through, never guessed ───────────────

for (const entry of entries) {
  if (JSON.stringify(withDerived(entry).specIndex) !== JSON.stringify(entry.specIndex)) {
    report(`${entry.slug}: withDerived modified specIndex`, 'it must be preserved verbatim');
  }
}

/**
 * `rebuildSpecIndex` is an acknowledged approximation — specIndex is keyed on
 * specMap field labels, which a finished document does not record. It is not
 * asserted to match; what is asserted is that it produces a schema-valid
 * shape. The agreement rate is reported so the cost of using it is visible
 * rather than assumed.
 */
let rebuildMatches = 0;
for (const entry of entries) {
  const rebuilt = rebuildSpecIndex(entry.specifications);

  for (const [key, value] of Object.entries(rebuilt)) {
    if (key.length === 0) {
      report(`${entry.slug}: rebuildSpecIndex produced an empty key`, JSON.stringify(value));
    }
    if (typeof value !== 'string' && typeof value !== 'number') {
      report(`${entry.slug}: rebuildSpecIndex produced a non-scalar`, `${key} -> ${typeof value}`);
    }
  }

  if (JSON.stringify(rebuilt) === JSON.stringify(entry.specIndex)) rebuildMatches++;
}

// ── slugify ───────────────────────────────────────────────────

/**
 * Not every name slugifies to its stored slug — the pipeline slugs from the
 * Wikipedia article title, and entries carry disambiguators. So this asserts
 * only the invariants that matter: whatever slugify emits is schema-legal,
 * and it is stable under a second pass.
 */
for (const entry of entries) {
  const slug = slugify(entry.name);
  if (slug && !/^[a-z0-9-]+$/.test(slug)) {
    report(`${entry.name}: slugify produced an illegal slug`, slug);
  }
  if (slugify(slug) !== slug) {
    report(`${entry.name}: slugify is not stable`, `${slug} -> ${slugify(slug)}`);
  }
}

// ── Summary ───────────────────────────────────────────────────

const pct = ((rebuildMatches / entries.length) * 100).toFixed(0);

console.log(`\nshared/derive.ts against the seeded corpus — ${entries.length} entries\n`);
console.log(`  countryCodes reconstructed exactly`);
console.log(`  kind matches the taxonomy`);
console.log(`  withDerived is a no-op on every seeded entry`);
console.log(`  specIndex preserved verbatim`);
console.log(`  rebuildSpecIndex agrees with the pipeline on ${rebuildMatches}/${entries.length} (${pct}%)`);
console.log(`    — an approximation by design, and opt-in in the editor`);
console.log(`\n${failures === 0 ? 'PASS' : `${failures} failure(s)`}`);

process.exit(failures === 0 ? 0 : 1);
