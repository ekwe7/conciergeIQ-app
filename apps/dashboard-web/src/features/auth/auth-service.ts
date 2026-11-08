/**
 * Auth service — thin typed wrappers around the backend authentication endpoints.
 *
 * Every function makes exactly one network request and either resolves with a
 * typed payload or rejects with an AppApiError.  Session storage is intentionally
 * kept out of this layer: callers (AuthProvider) decide when to persist tokens.
 *
 * Endpoints used:
 *   POST /api/v1/auth/login    — exchange credentials for a token pair
 *   POST /api/v1/auth/refresh  — rotate an expiring access token
 *   POST /api/v1/auth/logout   — revoke a refresh token server-side
 *   GET  /api/v1/auth/me       — fetch the authenticated user's profile
 */

import { api } from '../../lib/api-client';
import type { AuthTokenResponse, StaffUser } from '../../lib/api-types';

/**
 * Submits staff login credentials to the authentication endpoint.
 *
 * Returns a full token response (access token, refresh token, user profile)
 * on success. Throws AppApiError with statusCode 401 when the credentials do
 * not match any active account.
 *
 * Uses the unauthenticated client so an expired session token never accidentally
 * taints this call or triggers the 401 refresh interceptor.
 */
export async function loginWithEmailAndPassword(
  emailAddress: string,
  plainTextPassword: string,
): Promise<AuthTokenResponse> {
  return api.unauthenticated.post<AuthTokenResponse>('/auth/login', {
    email: emailAddress,
    password: plainTextPassword,
  });
}

/**
 * Exchanges the given refresh token for a fresh pair of access and refresh tokens.
 *
 * The backend invalidates the submitted refresh token immediately (rotating scheme),
 * so callers must store the returned tokens before the next request.  Reusing a
 * revoked or already-rotated token throws AppApiError with statusCode 401.
 *
 * Uses the unauthenticated client to avoid the 401 interceptor re-entering this
 * function and causing an infinite loop.
 */
export async function refreshAuthTokens(
  currentRefreshToken: string,
): Promise<AuthTokenResponse> {
  return api.unauthenticated.post<AuthTokenResponse>('/auth/refresh', {
    refreshToken: currentRefreshToken,
  });
}

/**
 * Revokes the given refresh token on the server, ending that session permanently.
 *
 * Always clear the local session before calling this function so the user is
 * signed out locally even if the network request fails (fire-and-forget is
 * acceptable; the refresh token will expire on its own after 7 days).
 *
 * Uses the unauthenticated client because the access token may already be gone
 * when this call is made (e.g. deliberate sign-out from the header).
 */
export async function logoutFromServer(
  currentRefreshToken: string,
): Promise<void> {
  await api.unauthenticated.post('/auth/logout', {
    refreshToken: currentRefreshToken,
  });
}

/**
 * Fetches the currently authenticated staff user's profile from the server.
 *
 * Useful for verifying that an in-memory session is still valid after a
 * period of inactivity, or for refreshing stale display-name / role data.
 * Uses the authenticated client so the 401 refresh interceptor applies.
 */
export async function fetchCurrentStaffUser(): Promise<StaffUser> {
  return api.get<StaffUser>('/auth/me');
}
