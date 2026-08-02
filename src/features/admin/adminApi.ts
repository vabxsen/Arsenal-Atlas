import { equipmentSchema, type Equipment } from '@shared/schema';
import { withDerived } from '@shared/derive';
import { COLLECTIONS, getDb } from '@/lib/firebase';

export { slugify } from '@shared/derive';

/**
 * The admin write path.
 *
 * Firestore is the system of record; content pages read the static export
 * built by `npm run seed`. So everything here writes to Firestore and nothing
 * here changes what visitors see — that gap is real, it is surfaced in the
 * overview as drift, and it closes on the next seed-and-deploy.
 *
 * Every write is validated against `shared/schema.ts` first, the same contract
 * the ETL pipeline validates against. `firestore.rules` re-checks a subset
 * server-side; this layer exists to give a human a readable error instead of
 * an opaque permission denial, not to replace that check.
 *
 * As everywhere else in `src/`, `firebase/*` is imported dynamically. A static
 * import here would put 172 KB back on every page load, including for the
 * visitors who will never see this screen.
 */

// ── Validation ────────────────────────────────────────────────

export interface FieldIssue {
  /** Dotted path into the document, e.g. `sources.0.url`. */
  path: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; value: Equipment }
  | { ok: false; issues: FieldIssue[] };

export function validateEquipment(draft: unknown): ValidationResult {
  const parsed = equipmentSchema.safeParse(draft);
  if (parsed.success) return { ok: true, value: withDerived(parsed.data) };

  return {
    ok: false,
    issues: parsed.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

// ── Reads ─────────────────────────────────────────────────────

/**
 * The whole collection in one query — 382 document reads.
 *
 * Paging would cost the same reads spread over more round-trips, and the
 * admin needs corpus-wide totals and drift on the first screen regardless.
 * Firestore's persistent cache is enabled app-wide, so repeat visits within a
 * session serve locally and re-reads only fetch what changed.
 */
export async function listEquipment(): Promise<Equipment[]> {
  const [{ collection, getDocs, orderBy, query }, db] = await Promise.all([
    import('firebase/firestore'),
    getDb(),
  ]);

  const snap = await getDocs(query(collection(db, COLLECTIONS.equipment), orderBy('name')));
  return snap.docs.map((doc) => doc.data() as Equipment);
}

export async function loadEquipment(slug: string): Promise<Equipment | null> {
  const [{ doc, getDoc }, db] = await Promise.all([import('firebase/firestore'), getDb()]);

  const snap = await getDoc(doc(db, COLLECTIONS.equipment, slug));
  return snap.exists() ? (snap.data() as Equipment) : null;
}

export async function slugExists(slug: string): Promise<boolean> {
  const [{ doc, getDoc }, db] = await Promise.all([import('firebase/firestore'), getDb()]);
  return (await getDoc(doc(db, COLLECTIONS.equipment, slug))).exists();
}

// ── Writes ────────────────────────────────────────────────────

/**
 * Documents are keyed by slug, matching `scripts/seed/push.ts` — so a later
 * reseed updates the same document in place rather than forking a duplicate
 * under a different id.
 */
export async function saveEquipment(entry: Equipment): Promise<void> {
  const [{ doc, setDoc }, db] = await Promise.all([import('firebase/firestore'), getDb()]);

  // A full replace, not a merge. Merging would make removal impossible: drop
  // a source or a spec group in the form, and a merged write would leave the
  // old array in place.
  await setDoc(doc(db, COLLECTIONS.equipment, entry.slug), entry);
}

export async function deleteEquipment(slug: string): Promise<void> {
  const [{ deleteDoc, doc }, db] = await Promise.all([import('firebase/firestore'), getDb()]);
  await deleteDoc(doc(db, COLLECTIONS.equipment, slug));
}

// ── Drafts ────────────────────────────────────────────────────

/** A blank entry, pre-filled with what the schema requires but cannot invent. */
export function emptyEquipment(): Equipment {
  const now = new Date().toISOString();
  return {
    id: '',
    slug: '',
    name: '',
    aliases: [],
    kind: 'firearm',
    category: 'firearms',
    description: '',
    facts: [],
    specifications: [],
    specIndex: {},
    images: {},
    gallery: [],
    countries: [],
    countryCodes: [],
    manufacturers: [],
    designers: [],
    operators: [],
    conflicts: [],
    variants: [],
    relatedEquipment: [],
    compatibleAmmunition: [],
    timeline: [],
    sources: [],
    popularity: 0,
    featured: false,
    publishedAt: now,
    updatedAt: now,
  };
}
