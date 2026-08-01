import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

/**
 * Firebase, loaded on demand.
 *
 * Every accessor here is async and dynamically imports the SDK. That is
 * deliberate: the Firebase bundle is ~172 KB gzipped, sign-in is optional, and
 * the default deployment ships no credentials at all — so a static import made
 * every visitor download an SDK that most of them never invoke. Because the
 * imports live behind `isFirebaseConfigured()`, an unconfigured build never
 * fetches the chunk.
 *
 * The app must render and remain fully browsable with Firebase absent.
 */

const config = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
};

const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';

/** Emulators accept any non-empty project id, so placeholders are enough. */
export function isFirebaseConfigured(): boolean {
  return useEmulators || Boolean(config.apiKey && config.projectId);
}

let appPromise: Promise<FirebaseApp> | undefined;
let dbPromise: Promise<Firestore> | undefined;
let authPromise: Promise<Auth> | undefined;

async function ensureApp(): Promise<FirebaseApp> {
  appPromise ??= (async () => {
    const { initializeApp } = await import('firebase/app');
    return initializeApp({
      ...config,
      projectId: config.projectId || 'arsenal-atlas-local',
      apiKey: config.apiKey || 'emulator-placeholder',
    });
  })();
  return appPromise;
}

export async function getDb(): Promise<Firestore> {
  dbPromise ??= (async () => {
    const app = await ensureApp();
    const { initializeFirestore, connectFirestoreEmulator, persistentLocalCache, persistentMultipleTabManager } =
      await import('firebase/firestore');

    // IndexedDB persistence doubles as the offline layer for the PWA and
    // keeps repeat visits from re-reading the whole corpus.
    const firestore = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
    if (useEmulators) connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
    return firestore;
  })();
  return dbPromise;
}

export async function getFirebaseAuth(): Promise<Auth> {
  authPromise ??= (async () => {
    const app = await ensureApp();
    const { getAuth, connectAuthEmulator } = await import('firebase/auth');
    const auth = getAuth(app);
    if (useEmulators) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    }
    return auth;
  })();
  return authPromise;
}

export const COLLECTIONS = {
  equipment: 'equipment',
  categories: 'categories',
  countries: 'countries',
  manufacturers: 'manufacturers',
  conflicts: 'conflicts',
  families: 'families',
  searchIndex: 'searchIndex',
  users: 'users',
} as const;
