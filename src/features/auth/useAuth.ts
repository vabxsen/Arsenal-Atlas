import { useContext } from 'react';
import { AuthContext, type AuthState } from './AuthContext';

/**
 * Lives apart from the provider component so that module exports only
 * components — otherwise Fast Refresh discards state on every edit.
 */
export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
