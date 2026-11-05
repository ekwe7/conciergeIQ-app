import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, refreshSession } from '../../lib/api-client';
import type { AuthTokenResponse, StaffUser } from '../../lib/api-types';
import { roleCan, type Permission } from '../../lib/permissions';
import { session } from '../../lib/session';

type AuthState =
  | { status: 'restoring' }
  /** `deliberate`: the user pressed Sign out, so the next sign-in starts fresh. */
  | { status: 'signed-out'; notice?: string; deliberate?: boolean }
  | { status: 'signed-in'; user: StaffUser };

interface AuthApi {
  state: AuthState;
  signIn(email: string, password: string): Promise<void>;
  signOut(notice?: string): Promise<void>;
  can(permission: Permission): boolean;
}

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>(() =>
    session.getRefreshToken() ? { status: 'restoring' } : { status: 'signed-out' },
  );

  // Resume a session kept in this tab (the refresh token survives a reload).
  useEffect(() => {
    if (state.status !== 'restoring') return;
    let cancelled = false;
    void refreshSession().then((tokens) => {
      if (cancelled) return;
      setState(tokens ? { status: 'signed-in', user: tokens.user } : { status: 'signed-out' });
    });
    return () => {
      cancelled = true;
    };
  }, [state.status]);

  // Any request that cannot renew its token ends the session here.
  useEffect(
    () =>
      session.onExpired(() => {
        queryClient.clear();
        setState({ status: 'signed-out', notice: 'Your session has ended. Sign in again to continue.' });
      }),
    [queryClient],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const tokens = await api.unauthenticated.post<AuthTokenResponse>('/auth/login', { email, password });
      queryClient.clear();
      session.store(tokens);
      setState({ status: 'signed-in', user: tokens.user });
    },
    [queryClient],
  );

  const signOut = useCallback(
    async (notice?: string) => {
      const refreshToken = session.getRefreshToken();
      session.clear();
      queryClient.clear();
      setState({ status: 'signed-out', notice, deliberate: !notice });
      if (refreshToken) {
        // Revoke on the server; the local session is already gone either way.
        await api.unauthenticated.post('/auth/logout', { refreshToken }).catch(() => undefined);
      }
    },
    [queryClient],
  );

  const value = useMemo<AuthApi>(
    () => ({
      state,
      signIn,
      signOut,
      can: (permission) => state.status === 'signed-in' && roleCan(state.user.role, permission),
    }),
    [state, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside AuthProvider');
  return auth;
}

/** The signed-in user. Only call inside routes behind `RequireAuth`. */
export function useCurrentUser(): StaffUser {
  const { state } = useAuth();
  if (state.status !== 'signed-in') throw new Error('useCurrentUser called while signed out');
  return state.user;
}
