import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cert, initializeApp, type AppOptions } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { CATEGORIES } from '../../shared/taxonomy.ts';
import type { Equipment, Family } from '../../shared/schema.ts';

/**
 * Push the seeded corpus into Firestore.
 *
 *   npm run emulators          # terminal 1
 *   npm run push               # terminal 2
 *
 * Targets the emulator by default via FIRESTORE_EMULATOR_HOST, so no
 * credentials are needed. Set GOOGLE_APPLICATION_CREDENTIALS to push to a
 * real project instead.
 *
 * Writes are idempotent: documents are keyed by slug and merged, so re-running
 * updates in place rather than duplicating.
 */

const DATA_DIR = join(process.cwd(), 'data');
const BATCH_LIMIT = 400; // Firestore caps a batch at 500 operations.

const projectId =
  process.env.GOOGLE_CLOUD_PROJECT ?? process.env.VITE_FB_PROJECT_ID ?? 'arsenal-atlas-local';

const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
if (!usingEmulator && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    'Neither FIRESTORE_EMULATOR_HOST nor GOOGLE_APPLICATION_CREDENTIALS is set.\n' +
      'Start the emulator with `npm run emulators`, or point at a real project.'
  );
  process.exit(1);
}

const options: AppOptions = { projectId };
if (!usingEmulator && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  options.credential = cert(process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

initializeApp(options);
const db = getFirestore();

async function readJson<T>(name: string): Promise<T> {
  try {
    return JSON.parse(await readFile(join(DATA_DIR, name), 'utf8')) as T;
  } catch (error) {
    // data/ is gitignored, so a fresh clone has no corpus to push.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(
        `data/${name} not found.\n` +
          'The corpus is not committed — run `npm run seed` first to generate it.'
      );
      process.exit(1);
    }
    throw error;
  }
}

async function commitInBatches<T>(
  label: string,
  items: readonly T[],
  collection: string,
  idOf: (item: T) => string
): Promise<void> {
  for (let start = 0; start < items.length; start += BATCH_LIMIT) {
    const batch = db.batch();
    for (const item of items.slice(start, start + BATCH_LIMIT)) {
      batch.set(db.collection(collection).doc(idOf(item)), item as object, { merge: true });
    }
    await batch.commit();
  }
  console.log(`  ${label.padEnd(14)} ${items.length}`);
}

async function main(): Promise<void> {
  console.log(`Pushing to ${usingEmulator ? `emulator (${process.env.FIRESTORE_EMULATOR_HOST})` : projectId}\n`);

  const equipment = await readJson<Equipment[]>('equipment.json');
  const families = await readJson<Family[]>('families.json');

  await commitInBatches('equipment', equipment, 'equipment', (e) => e.slug);
  await commitInBatches('families', families, 'families', (f) => f.id);

  // Category documents carry live counts so the browse index doesn't need an
  // aggregate query on every visit.
  const counts = new Map<string, number>();
  for (const item of equipment) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);

  const categories = CATEGORIES.map((category) => ({
    ...category,
    count: counts.get(category.slug) ?? 0,
  }));
  await commitInBatches('categories', categories, 'categories', (c) => c.slug);

  // Country aggregates for the explorer.
  const byCountry = new Map<string, { iso3: string; name: string; count: number }>();
  for (const item of equipment) {
    for (const country of item.countries) {
      if (!country.iso3) continue;
      const existing = byCountry.get(country.iso3);
      if (existing) existing.count++;
      else byCountry.set(country.iso3, { iso3: country.iso3, name: country.name, count: 1 });
    }
  }
  await commitInBatches('countries', [...byCountry.values()], 'countries', (c) => c.iso3);

  console.log('\nDone.');
}

await main();
