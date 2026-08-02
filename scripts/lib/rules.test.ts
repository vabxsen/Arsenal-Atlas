/**
 * Exercises the admin write path against the emulators, through the *client*
 * SDK and therefore through firestore.rules.
 *
 * `npm run push` uses the Admin SDK, which bypasses rules entirely — so it
 * proves nothing about whether the dashboard can actually write, nor whether
 * anyone else is kept out. This mirrors the operations in
 * src/features/admin/adminApi.ts one for one, signed in as a real user with
 * the admin custom claim, and checks that a signed-in non-admin is refused.
 *
 * Requires Java (the Firestore emulator is a JVM process):
 *
 *   npm run emulators      # terminal 1
 *   npm run push           # terminal 2, once — loads the corpus
 *   npm run test:rules     # terminal 2
 *
 * Leaves the corpus as it found it: the one entry it edits is restored, and
 * the entry it creates is deleted.
 */
import { initializeApp as initAdmin } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { withDerived } from '../../shared/derive.ts';
import { equipmentSchema, type Equipment } from '../../shared/schema.ts';

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
const projectId = 'arsenal-atlas-local';

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `\n      ${detail}` : ''}`);
  if (!ok) failures++;
};

// ── Mint the two identities ───────────────────────────────────

initAdmin({ projectId });
const adminAuth = getAdminAuth();

const ensureUser = async (uid: string, email: string, claims: object) => {
  try {
    await adminAuth.createUser({ uid, email });
  } catch {
    /* already exists from a previous run */
  }
  await adminAuth.setCustomUserClaims(uid, claims);
  return adminAuth.createCustomToken(uid, claims);
};

const adminToken = await ensureUser('admin-user', 'admin@example.com', { admin: true });
const plainToken = await ensureUser('plain-user', 'plain@example.com', {});

// ── Client SDK, as the app configures it ──────────────────────

const app = initializeApp({ projectId, apiKey: 'emulator-placeholder' });
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

// Plain getFirestore rather than the app's persistentLocalCache: IndexedDB
// does not exist in Node. The wire behaviour under test is identical.
const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);

const signInAs = async (token: string) => {
  await signOut(auth).catch(() => undefined);
  const credential = await signInWithCustomToken(auth, token);
  // Force a refresh so the custom claim is on the token, exactly as the
  // dashboard's "Refresh token" button does.
  await credential.user.getIdToken(true);
  return credential.user;
};

// ── As an admin ───────────────────────────────────────────────

const user = await signInAs(adminToken);
const claims = (await user.getIdTokenResult()).claims;
check('admin claim lands on the ID token', claims.admin === true, `claims.admin = ${String(claims.admin)}`);

// listEquipment()
const snap = await getDocs(query(collection(db, 'equipment'), orderBy('name')));
check('listEquipment: ordered query resolves without a composite index', snap.size === 382, `${snap.size} docs`);

const names = snap.docs.map((d) => (d.data() as Equipment).name);
const sorted = [...names].sort();
check('listEquipment: results actually ordered by name', names.join('|') === sorted.join('|'));

// loadEquipment()
const ak = await getDoc(doc(db, 'equipment', 'ak-47'));
check('loadEquipment: reads a known entry', ak.exists() && (ak.data() as Equipment).slug === 'ak-47');

// saveEquipment() — update an existing entry, the common case
const original = ak.data() as Equipment;
const edited = withDerived({
  ...original,
  description: `${original.description} [edited by verification run]`,
  updatedAt: new Date().toISOString(),
});
check('edited entry still parses against equipmentSchema', equipmentSchema.safeParse(edited).success);

await setDoc(doc(db, 'equipment', edited.slug), edited);
const reread = await getDoc(doc(db, 'equipment', 'ak-47'));
check(
  'saveEquipment: update is accepted by the rules and persisted',
  (reread.data() as Equipment).description.endsWith('[edited by verification run]')
);

// Restore, so a re-run starts from the seeded state.
await setDoc(doc(db, 'equipment', 'ak-47'), original);

// saveEquipment() — create
const created = withDerived({
  ...equipmentSchema.parse({
    ...original,
    id: 'verify-temp-entry',
    slug: 'verify-temp-entry',
    name: 'Verification Temp Entry',
  }),
});
await setDoc(doc(db, 'equipment', created.slug), created);
check('saveEquipment: create is accepted', (await getDoc(doc(db, 'equipment', created.slug))).exists());

// deleteEquipment()
await deleteDoc(doc(db, 'equipment', created.slug));
check('deleteEquipment: removes the document', !(await getDoc(doc(db, 'equipment', created.slug))).exists());

// The attribution rule — a write with no sources must be refused.
let refusedNoSources = false;
try {
  await setDoc(doc(db, 'equipment', 'verify-no-sources'), { ...created, sources: [] });
} catch {
  refusedNoSources = true;
}
check('rules reject an entry with no sources (CC BY-SA attribution)', refusedNoSources);

// And a malformed slug.
let refusedBadSlug = false;
try {
  await setDoc(doc(db, 'equipment', 'Bad Slug'), { ...created, slug: 'Bad Slug' });
} catch {
  refusedBadSlug = true;
}
check('rules reject a non-kebab-case slug', refusedBadSlug);

// ── As a signed-in non-admin ──────────────────────────────────

await signInAs(plainToken);

const publicRead = await getDoc(doc(db, 'equipment', 'ak-47'));
check('non-admin can still read content', publicRead.exists());

let refusedWrite = false;
try {
  await setDoc(doc(db, 'equipment', 'ak-47'), { ...original, name: 'Hijacked' });
} catch {
  refusedWrite = true;
}
check('non-admin write is refused by the rules', refusedWrite);

let refusedDelete = false;
try {
  await deleteDoc(doc(db, 'equipment', 'ak-47'));
} catch {
  refusedDelete = true;
}
check('non-admin delete is refused by the rules', refusedDelete);

const untouched = await getDoc(doc(db, 'equipment', 'ak-47'));
check('ak-47 survived the non-admin attempts', (untouched.data() as Equipment).name === original.name);

console.log(`\n${failures === 0 ? 'PASS — admin write path verified' : `${failures} failure(s)`}`);
process.exit(failures === 0 ? 0 : 1);
