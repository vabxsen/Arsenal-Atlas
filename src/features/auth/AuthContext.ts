import { createContext } from 'react';
import type { User } from 'firebase/auth';

export interface AuthState {
  user: User | null;
  loading: boolean;
  /** Whether sign-in is possible at all in this deployment. */
  available: boolean;
  /**
   * Mirrors the `admin` custom claim on the ID token — the same signal
   * `firestore.rules` gates writes on, so the UI and the server agree on who
   * is an admin. It is read from the token, never from a document, because a
   * document a user can edit is not an authorisation source.
   */
  isAdmin: boolean;
  /** True while the token claims for the current user are still being read. */
  claimsLoading: boolean;
  /**
   * Force-refreshes the ID token. Custom claims are minted server-side and do
   * not reach an already-issued token, so a newly promoted admin stays locked
   * out for up to an hour unless the token is refreshed explicitly.
   */
  refreshClaims: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

export const AuthContext = createContext<AuthState | null>(null);
