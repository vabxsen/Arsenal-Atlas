import { createContext } from 'react';
import type { User } from 'firebase/auth';

export interface AuthState {
  user: User | null;
  loading: boolean;
  /** Whether sign-in is possible at all in this deployment. */
  available: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

export const AuthContext = createContext<AuthState | null>(null);
