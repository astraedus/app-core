/**
 * Auth context provider -- wraps app with auth state.
 * Use useAuthContext() in child components to access auth.
 */

import { createContext, useContext, ReactNode } from 'react';
import { useAuth, type UseAuthOptions } from './useAuth';

type AuthContextType = ReturnType<typeof useAuth>;

const AuthContext = createContext<AuthContextType | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
  authOptions?: UseAuthOptions;
}

export function AuthProvider({ children, authOptions }: AuthProviderProps) {
  const auth = useAuth(authOptions);
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return ctx;
}
