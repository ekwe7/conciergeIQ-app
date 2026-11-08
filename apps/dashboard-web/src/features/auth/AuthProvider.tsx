/**
 * AuthProvider — React context that owns the authentication state machine.
 *
 * State transitions:
 *   'restoring'  → page just loaded; a stored refresh token is being exchanged.
 *   'signed-in'  → a valid access token exists; API calls are permitted.
 *   'signed-out' → no session; the sign-in page is shown.
 *
 * Token strategy:
 *   - Access tokens (15-min TTL) are held in module-level memory only (session.ts).
 *   - Refresh tokens (7-day TTL) are stored in localStorage when the user enables
 *     "Keep me signed in on this device", otherwise kept only in memory.
 *   - The 401 interceptor in api-client.ts silently rotates tokens during active use.
 */

import { AppApiError } from '@conciergeiq/utils';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthTokenResponse, StaffUser } from '../../lib/api-types';
import { roleCan, type Permission } from '../../lib/permissions';
import { session } from '../../lib/session';
import { loginWithEmailAndPassword, logoutFromServer, refreshAuthTokens } from './auth-service';

/** All possible authentication states the application can be in. */
type AuthenticationState =
  | { status: 'restoring' }
  /** `deliberate: true` means the user pressed Sign out; the next sign-in starts fresh. */
  | { status: 'signed-out'; notice?: string; deliberate?: boolean }
  | { status: 'signed-in'; user: StaffUser };

/** The public API surface exposed through AuthContext. */
interface AuthContextApi {
  state: AuthenticationState;
  /**
   * Authenticates with email and password, stores tokens, and transitions to signed-in.
   * @param keepSignedIn - When true, persists the refresh token to localStorage so
   *   the session survives a browser restart. Defaults to true.
   */
  signIn(emailAddress: string, plainTextPassword: string, keepSignedIn?: boolean): Promise<void>;
  /**
   * Clears all local tokens, calls the server logout endpoint to revoke the refresh
   * token, and transitions to signed-out.
   * @param notice - Optional message shown on the sign-in page (e.g. "Session ended").
   */
  signOut(notice?: string): Promise<void>;
  /** Returns true if the signed-in user's role permits the given action. */
  can(permission: Permission): boolean;
}

const AuthContext = createContext<AuthContextApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [authenticationState, setAuthenticationState] = useState<AuthenticationState>(() =>
    // If there is a persisted refresh token we attempt to restore the session.
    session.getRefreshToken() ? { status: 'restoring' } : { status: 'signed-out' },
  );

  // ─── Session Restoration ────────────────────────────────────────────────────
  // On initial load (or whenever status flips back to 'restoring'), exchange the
  // stored refresh token for a fresh access token.
  useEffect(() => {
    if (authenticationState.status !== 'restoring') return;
    let isCancelled = false;

    const storedRefreshToken = session.getRefreshToken();
    if (!storedRefreshToken) {
      setAuthenticationState({ status: 'signed-out' });
      return;
    }

    refreshAuthTokens(storedRefreshToken)
      .then((freshTokens: AuthTokenResponse) => {
        if (isCancelled) return;
        // Persist to localStorage if the refresh token was already there (i.e. the
        // user had chosen "Keep me signed in").  The token was already in storage,
        // so we keep it there; pass `true` to continue the preference.
        session.store(freshTokens, true);
        setAuthenticationState({ status: 'signed-in', user: freshTokens.user });
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        // A 401 means the refresh token was revoked or expired — sign out silently.
        if (error instanceof AppApiError && error.statusCode === 401) {
          session.clear();
        }
        setAuthenticationState({ status: 'signed-out' });
      });

    return () => {
      isCancelled = true;
    };
  }, [authenticationState.status]);

  // ─── Unexpected Session Expiry ──────────────────────────────────────────────
  // The 401 interceptor in api-client.ts calls session.expire() when it cannot
  // renew the access token (token revoked mid-session).  We listen for that event
  // and transition to signed-out with an informational notice.
  useEffect(
    () =>
      session.onExpired(() => {
        queryClient.clear();
        setAuthenticationState({
          status: 'signed-out',
          notice: 'Your session has ended. Sign in again to continue.',
        });
      }),
    [queryClient],
  );

  // ─── Sign In ────────────────────────────────────────────────────────────────
  const signIn = useCallback(
    async (emailAddress: string, plainTextPassword: string, keepSignedIn: boolean = true) => {
      const freshTokens = await loginWithEmailAndPassword(emailAddress, plainTextPassword);
      queryClient.clear();
      session.store(freshTokens, keepSignedIn);
      setAuthenticationState({ status: 'signed-in', user: freshTokens.user });
    },
    [queryClient],
  );

  // ─── Sign Out ───────────────────────────────────────────────────────────────
  const signOut = useCallback(
    async (notice?: string) => {
      const refreshTokenToRevoke = session.getRefreshToken();
      // Clear local state first so the UI responds immediately regardless of
      // whether the network request to revoke the token succeeds.
      session.clear();
      queryClient.clear();
      setAuthenticationState({ status: 'signed-out', notice, deliberate: !notice });
      if (refreshTokenToRevoke) {
        // Fire-and-forget: failure only means the token expires naturally after 7 days.
        await logoutFromServer(refreshTokenToRevoke).catch(() => undefined);
      }
    },
    [queryClient],
  );

  const contextValue = useMemo<AuthContextApi>(
    () => ({
      state: authenticationState,
      signIn,
      signOut,
      can: (permission) =>
        authenticationState.status === 'signed-in' &&
        roleCan(authenticationState.user.role, permission),
    }),
    [authenticationState, signIn, signOut],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

/** Returns the auth context API. Must be called inside a component wrapped by AuthProvider. */
export function useAuth(): AuthContextApi {
  const authContextApi = useContext(AuthContext);
  if (!authContextApi) {
    throw new Error('useAuth must be called inside a component wrapped by <AuthProvider>.');
  }
  return authContextApi;
}

/**
 * Returns the currently signed-in user.
 * Only call this inside routes guarded by RequireAuth — it throws if the user is not signed in.
 */
export function useCurrentUser(): StaffUser {
  const { state } = useAuth();
  if (state.status !== 'signed-in') {
    throw new Error('useCurrentUser was called while the user is not signed in.');
  }
  return state.user;
}
