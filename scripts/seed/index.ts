import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildConflictIndex } from '../../shared/conflicts.ts';
import { headlineSpec, manufacturerLabel, roleLabel } from '../../shared/headline.ts';
import type { ListingEntry as ListingRow } from '../../shared/listing.ts';
import { equipmentSchema, familySchema, searchIndexSchema } from '../../shared/schema.ts';
import type { Equipment, SearchEntry } from '../../shared/schema.ts';
import { mapLimit } from '../lib/http.ts';
import { CATALOG, FAMILIES } from './catalog.ts';
import { normalize } from './normalize.ts';
import { fetchAliases, fetchGallery, fetchInfobox, fetchSections, fetchSummary } from './sources.ts';

/**
 * Seed pipeline entry point.
 *
 *   npm run seed                 fetch, normalise, validate, write data/
 *   npm run seed -- --fetch-only skip the Firestore push
 *
 * Every response is disk-cached, so re-runs are effectively free and iterating
 * on the normaliser costs no network traffic.
 */

const DATA_DIR = join(process.cwd(), 'data');
const PUBLIC_DIR = join(process.cwd(), 'public');

interface Failure {
  title: string;
  reason: string;
}

async function buildEquipment(): Promise<{ entries: Equipment[]; failures: Failure[] }> {
  const entries: Equipment[] = [];
  const failures: Failure[] = [];
  let done = 0;

  await mapLimit(CATALOG, 4, async (entry) => {
    try {
      const summary = await fetchSummary(entry.title);
      if (!summary) {
        failures.push({ title: entry.title, reason: 'unusable article' });
        return;
      }

      // Use the canonical title for the remaining calls so redirects resolve once.
      const [params, sections, gallery, redirects] = await Promise.all([
        fetchInfobox(summary.title),
        fetchSections(summary.title),
        fetchGallery(summary.title),
        fetchAliases(summary.title),
      ]);

      const normalized = normalize({ entry, summary, params, sections, gallery, redirects });
      if (!normalized) {
        failures.push({ title: entry.title, reason: 'too little content' });
        return;
      }

      const result = equipmentSchema.safeParse(normalized);
      if (!result.success) {
        const issue = result.error.issues[0];
        failures.push({
          title: entry.title,
          reason: `validation: ${issue?.path.join('.')} ${issue?.message}`,
        });
        return;
      }

      entries.push(result.data);
    } catch (error) {
      failures.push({ title: entry.title, reason: (error as Error).message });
    } finally {
      done++;
      if (done % 25 === 0) console.log(`  ...${done}/${CATALOG.length}`);
    }
  });

  return { entries, failures };
}

/**
 * The payload Fuse.js searches. Written to public/ rather than Firestore:
 * a static asset is faster to fetch, free to serve, and cached by the service
 * worker — and search still costs zero Firestore reads per keystroke.
 */
function buildSearchIndex(entries: Equipment[]) {
  const searchEntries: SearchEntry[] = entries
    .map((item) => {
      const entry: SearchEntry = {
        id: item.id,
        slug: item.slug,
        name: item.name,
        aliases: item.aliases,
        category: item.category,
        kind: item.kind,
        popularity: item.popularity,
      };
      const country = item.countries[0]?.name;
      if (country) entry.country = country;
      const thumb = item.images.thumb ?? item.images.hero?.url;
      if (thumb) entry.thumb = thumb;
      if (item.serviceStart !== undefined) entry.year = item.serviceStart;
      return entry;
    })
    .sort((a, b) => b.popularity - a.popularity);

  return searchIndexSchema.parse({
    version: 1,
    builtAt: new Date().toISOString(),
    entries: searchEntries,
  });
}

/**
 * Build-time static export the app reads at runtime.
 *
 * Firestore stays the system of record and the admin write target, but content
 * pages read these files: a per-slug document fetch is a single cached CDN
 * request, costs nothing to serve, and works offline via the service worker.
 * `listing.json` carries only what grids and rails need, so a category page
 * never downloads full prose for entries it will not show.
 */
async function writeStaticExport(entries: Equipment[], families: unknown[]): Promise<void> {
  const outDir = join(PUBLIC_DIR, 'data');
  await mkdir(join(outDir, 'equipment'), { recursive: true });

  // Two catalog titles can resolve to the same article — a redirect, or simply
  // the same weapon listed under two categories. The slug is the document id
  // everywhere downstream (file name, Firestore key, route), so a collision
  // silently drops an entry: the corpus reports the full count while one file
  // overwrites another and one route never gets prerendered. Cheap to detect,
  // invisible if you do not.
  const bySlug = new Map<string, string[]>();
  for (const entry of entries) {
    bySlug.set(entry.slug, [...(bySlug.get(entry.slug) ?? []), entry.name]);
  }
  const collisions = [...bySlug].filter(([, names]) => names.length > 1);
  if (collisions.length > 0) {
    console.error('\nDuplicate slugs — remove one of each pair from CATALOG:');
    for (const [slug, names] of collisions) {
      console.error(`  ${slug}: ${names.join(' + ')}`);
    }
    process.exit(1);
  }

  await Promise.all(
    entries.map((entry) =>
      writeFile(join(outDir, 'equipment', `${entry.slug}.json`), JSON.stringify(entry))
    )
  );

  /**
   * The projection every grid and rail reads.
   *
   * manufacturer/role/spec are assigned conditionally rather than set to
   * `undefined`, so absent fields are omitted from the JSON entirely. That is
   * worth ~4 KB gzipped across 482 entries, and it matches the client type,
   * where `exactOptionalPropertyTypes` distinguishes an absent property from
   * one present and undefined.
   */
  const listing = entries.map((entry) => {
    const row: ListingRow = {
      id: entry.id,
      slug: entry.slug,
      name: entry.name,
      category: entry.category,
      kind: entry.kind,
      description: entry.description.slice(0, 180),
      thumb: entry.images.thumb ?? entry.images.hero?.url,
      hero: entry.images.hero?.url,
      heroWidth: entry.images.hero?.width,
      heroHeight: entry.images.hero?.height,
      countries: entry.countries,
      countryCodes: entry.countryCodes,
      serviceStart: entry.serviceStart,
      popularity: entry.popularity,
      featured: entry.featured,
      galleryCount: entry.gallery.length,
    };

    const manufacturer = manufacturerLabel(entry);
    if (manufacturer) row.manufacturer = manufacturer;

    const role = roleLabel(entry.subcategory);
    if (role) row.role = role;

    // Role is passed so the figure can be skipped when the role already
    // states it — see the note in headlineSpec.
    const spec = headlineSpec(entry, role);
    if (spec) row.spec = spec;

    return row;
  });

  const conflicts = buildConflictIndex(entries);

  await writeFile(join(outDir, 'listing.json'), JSON.stringify(listing));
  await writeFile(join(outDir, 'families.json'), JSON.stringify(families));
  await writeFile(join(outDir, 'conflicts.json'), JSON.stringify(conflicts));

  /*
   * Coverage is reported, not asserted.
   *
   * These three fields degrade by design — a card with no manufacturer renders
   * one fewer line. So a normaliser change that quietly halved coverage would
   * pass every gate and simply make the product blander. Printing the numbers
   * is what makes that visible on the next reseed.
   */
  const covered = (predicate: (row: ListingRow) => boolean) =>
    `${listing.filter(predicate).length}/${listing.length}`;
  console.log(
    `\nCard metadata coverage:\n` +
      `  manufacturer  ${covered((r) => r.manufacturer !== undefined)}\n` +
      `  role          ${covered((r) => r.role !== undefined)}\n` +
      `  headline spec ${covered((r) => r.spec !== undefined)}\n` +
      `  conflicts     ${conflicts.length} distinct across ` +
      `${entries.filter((e) => e.conflicts.length > 0).length} entries`
  );
}

async function main(): Promise<void> {
  console.log(`Seeding ${CATALOG.length} catalogued entries...\n`);
  const started = Date.now();

  const { entries, failures } = await buildEquipment();
  entries.sort((a, b) => b.popularity - a.popularity);

  const families = FAMILIES.map((family) =>
    familySchema.parse({
      id: family.id,
      name: family.name,
      description: family.description,
      nodes: family.nodes,
    })
  );

  const searchIndex = buildSearchIndex(entries);

  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(PUBLIC_DIR, { recursive: true });
  await writeFile(join(DATA_DIR, 'equipment.json'), JSON.stringify(entries, null, 2));
  await writeFile(join(DATA_DIR, 'families.json'), JSON.stringify(families, null, 2));
  await writeFile(join(PUBLIC_DIR, 'search-index.json'), JSON.stringify(searchIndex));

  await writeStaticExport(entries, families);

  // ── Report ──────────────────────────────────────────────────
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  const withHero = entries.filter((e) => e.images.hero).length;
  const withHistory = entries.filter((e) => e.history).length;
  const withSpecs = entries.filter((e) => e.specifications.length > 0).length;
  const galleryTotal = entries.reduce((sum, e) => sum + e.gallery.length, 0);

  console.log(`\n${'─'.repeat(58)}`);
  console.log(`Seeded      ${entries.length}/${CATALOG.length} entries in ${elapsed}s`);
  console.log(`Hero image  ${withHero} (${pct(withHero, entries.length)})`);
  console.log(`History     ${withHistory} (${pct(withHistory, entries.length)})`);
  console.log(`Specs       ${withSpecs} (${pct(withSpecs, entries.length)})`);
  console.log(`Gallery     ${galleryTotal} images, ${(galleryTotal / entries.length).toFixed(1)} avg`);
  console.log(`Families    ${families.length}`);
  console.log(`${'─'.repeat(58)}`);

  if (failures.length) {
    console.log(`\n${failures.length} skipped:`);
    for (const failure of failures) {
      console.log(`  - ${failure.title}: ${failure.reason}`);
    }
  }

  console.log(`\nWrote data/equipment.json, data/families.json, public/search-index.json`);
}

function pct(value: number, total: number): string {
  return total === 0 ? '0%' : `${Math.round((value / total) * 100)}%`;
}

await main();
