import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { COLLECTIONS, getDb, isFirebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/features/auth/useAuth';

/**
 * Favorites and recently-viewed.
 *
 * Local-first by design. Both live in localStorage and work with no account
 * and no Firebase config at all; signing in mirrors favorites to Firestore so
 * they follow the user across devices. That ordering matters — a reference
 * site should not require an account to let someone keep a reading list.
 *
 * Recently-viewed deliberately stays device-local: it is browsing history, and
 * syncing it to a server is a privacy cost with little user benefit.
 */

const FAVORITES_KEY = 'aa.favorites';
const RECENT_KEY = 'aa.recently-viewed';
const RECENT_LIMIT = 24;

// ── Tiny persisted store ──────────────────────────────────────

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeList(key: string, value: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Quota or private mode — the in-memory copy still works this session. */
  }
}

function createStore(key: string) {
  let snapshot: string[] = typeof window === 'undefined' ? [] : readList(key);
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const listener of listeners) listener();
  };

  // Arrow properties, not methods: these get passed unbound to
  // useSyncExternalStore, so they must not depend on a `this` receiver.
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    // Must return a stable reference between writes: useSyncExternalStore
    // compares by identity and would otherwise loop forever.
    get: () => snapshot,
    set: (next: string[]) => {
      snapshot = next;
      writeList(key, next);
      emit();
    },
  };
}

const favoritesStore = createStore(FAVORITES_KEY);
const recentStore = createStore(RECENT_KEY);

const emptyList: string[] = [];

// ── Favorites ─────────────────────────────────────────────────

export function useFavorites() {
  const { user } = useAuth();
  const favorites = useSyncExternalStore(
    favoritesStore.subscribe,
    favoritesStore.get,
    () => emptyList
  );

  /**
   * Adopt the cloud copy on sign-in, merged with whatever was collected
   * anonymously — signing in should never look like it deleted your list.
   */
  useEffect(() => {
    if (!user || !isFirebaseConfigured()) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    // Firestore is imported here rather than at module scope so the SDK is
    // only fetched once someone actually signs in.
    void (async () => {
      const [{ collection, doc, onSnapshot, setDoc }, db] = await Promise.all([
        import('firebase/firestore'),
        getDb(),
      ]);
      if (cancelled) return;

      const ref = collection(db, COLLECTIONS.users, user.uid, 'favorites');
      unsubscribe = onSnapshot(
        ref,
        (snap) => {
          const remote = snap.docs.map((d) => d.id);
          const merged = [...new Set([...favoritesStore.get(), ...remote])];
          favoritesStore.set(merged);

          // Push anything local that the server has not seen yet.
          for (const slug of merged) {
            if (!remote.includes(slug)) {
              void setDoc(doc(ref, slug), { addedAt: new Date().toISOString() }).catch(
                () => undefined
              );
            }
          }
        },
        () => undefined
      );
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user]);

  const toggle = useCallback(
    (slug: string) => {
      const current = favoritesStore.get();
      const isFavorite = current.includes(slug);
      // Local state updates synchronously and is the source of truth for the
      // UI; a failed or slow sync must never roll back what the user just did.
      favoritesStore.set(isFavorite ? current.filter((s) => s !== slug) : [slug, ...current]);

      if (!user || !isFirebaseConfigured()) return;

      void (async () => {
        try {
          const [{ doc, deleteDoc, setDoc }, db] = await Promise.all([
            import('firebase/firestore'),
            getDb(),
          ]);
          const ref = doc(db, COLLECTIONS.users, user.uid, 'favorites', slug);
          await (isFavorite ? deleteDoc(ref) : setDoc(ref, { addedAt: new Date().toISOString() }));
        } catch {
          /* Offline or rules rejection — the local copy still stands. */
        }
      })();
    },
    [user]
  );

  const isFavorite = useCallback((slug: string) => favorites.includes(slug), [favorites]);

  return { favorites, toggle, isFavorite, synced: Boolean(user) };
}

// ── Recently viewed ───────────────────────────────────────────

export function useRecentlyViewed() {
  return useSyncExternalStore(recentStore.subscribe, recentStore.get, () => emptyList);
}

/** Records a visit. Called once per detail page mount. */
export function recordVisit(slug: string): void {
  const current = recentStore.get();
  if (current[0] === slug) return;
  recentStore.set([slug, ...current.filter((s) => s !== slug)].slice(0, RECENT_LIMIT));
}

export function clearRecentlyViewed(): void {
  recentStore.set([]);
}
