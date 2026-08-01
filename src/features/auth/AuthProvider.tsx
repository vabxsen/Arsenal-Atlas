import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase';
import { AuthContext, type AuthState } from './AuthContext';

/**
 * Authentication.
 *
 * Sign-in is entirely optional: the encyclopedia is public, and every user
 * feature works offline against localStorage. Signing in only adds sync across
 * devices. `available` is false when no Firebase config is present, and the UI
 * hides the affordance rather than offering a button that cannot work.
 *
 * The SDK is imported dynamically so an unconfigured build never downloads it.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const available = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(available);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      try {
        const [{ onAuthStateChanged }, auth] = await Promise.all([
          import('firebase/auth'),
          getFirebaseAuth(),
        ]);
        if (cancelled) return;

        unsubscribe = onAuthStateChanged(
          auth,
          (next) => {
            if (cancelled) return;
            setUser(next);
            setLoading(false);
          },
          () => !cancelled && setLoading(false)
        );
      } catch {
        // Misconfigured credentials must not take the whole app down — the
        // content is public and does not depend on auth.
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [available]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      available,
      error,
      signIn: async () => {
        setError(null);
        try {
          const [{ GoogleAuthProvider, signInWithPopup }, auth] = await Promise.all([
            import('firebase/auth'),
            getFirebaseAuth(),
          ]);
          await signInWithPopup(auth, new GoogleAuthProvider());
        } catch (caught) {
          const code = (caught as { code?: string }).code ?? '';
          // A closed popup is a user action, not a failure worth reporting.
          if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
            return;
          }
          setError('Sign-in failed. Please try again.');
        }
      },
      signOut: async () => {
        try {
          const [{ signOut: fbSignOut }, auth] = await Promise.all([
            import('firebase/auth'),
            getFirebaseAuth(),
          ]);
          await fbSignOut(auth);
        } catch {
          setError('Sign-out failed.');
        }
      },
    }),
    [user, loading, available, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
