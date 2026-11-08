/**
 * Unit tests for auth-service.ts
 *
 * Each function is tested in isolation: the global `fetch` is replaced by the
 * `fakeApi` helper so no real network traffic is produced.  These tests
 * focus on the request shape, response mapping, and error propagation for every
 * auth endpoint.
 *
 * Coverage:
 *   loginWithEmailAndPassword   — success, wrong credentials (401), network failure
 *   refreshAuthTokens           — success, revoked token (401), deduplication not applicable here
 *   logoutFromServer            — success (204), graceful 401 tolerance
 *   fetchCurrentStaffUser       — success, unauthenticated (401)
 */

import { AppApiError } from '@conciergeiq/utils';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  fetchCurrentStaffUser,
  loginWithEmailAndPassword,
  logoutFromServer,
  refreshAuthTokens,
} from '../src/features/auth/auth-service';
import { session } from '../src/lib/session';
import { fakeApi, reply, staffUser, HOTEL } from './support';

// ──────────────────────────────────────────────────────────────────────────────
// Shared fixture builders
// ──────────────────────────────────────────────────────────────────────────────

const ACCESS_TOKEN_VALUE = 'at-abc123';
const REFRESH_TOKEN_VALUE = 'rt-xyz456';
const NEXT_REFRESH_TOKEN_VALUE = 'rt-rotated-789';

function buildTokenResponse(overrides: Record<string, unknown> = {}) {
  return {
    accessToken: ACCESS_TOKEN_VALUE,
    refreshToken: REFRESH_TOKEN_VALUE,
    expiresIn: 900,
    user: staffUser(),
    ...overrides,
  };
}

function buildUnauthorizedErrorBody(messageText = 'Invalid email or password') {
  return { error: { code: 'UNAUTHORIZED', message: messageText } };
}

// ──────────────────────────────────────────────────────────────────────────────
// loginWithEmailAndPassword
// ──────────────────────────────────────────────────────────────────────────────

describe('loginWithEmailAndPassword', () => {
  it('sends email and password to POST /auth/login and returns the token response', async () => {
    const { calls } = fakeApi({
      'POST /auth/login': () => buildTokenResponse(),
    });

    const tokenResponse = await loginWithEmailAndPassword('amaka@azurebay.test', 'ChangeMe123!');

    expect(tokenResponse.accessToken).toBe(ACCESS_TOKEN_VALUE);
    expect(tokenResponse.refreshToken).toBe(REFRESH_TOKEN_VALUE);
    expect(tokenResponse.expiresIn).toBe(900);
    expect(tokenResponse.user.email).toBe('amaka@azurebay.test');

    const loginCall = calls.find((call) => call.method === 'POST' && call.path === '/auth/login');
    expect(loginCall).toBeDefined();
    expect(loginCall?.body).toEqual({ email: 'amaka@azurebay.test', password: 'ChangeMe123!' });
  });

  it('does NOT attach an Authorization header (unauthenticated endpoint)', async () => {
    const { calls } = fakeApi({
      'POST /auth/login': () => buildTokenResponse(),
    });

    await loginWithEmailAndPassword('amaka@azurebay.test', 'ChangeMe123!');

    const loginCall = calls.find((call) => call.method === 'POST' && call.path === '/auth/login');
    expect(loginCall?.authorization).toBeNull();
  });

  it('throws an AppApiError with statusCode 401 when the credentials are wrong', async () => {
    fakeApi({
      'POST /auth/login': () =>
        reply(401, buildUnauthorizedErrorBody('Invalid email or password')),
    });

    await expect(loginWithEmailAndPassword('amaka@azurebay.test', 'wrongpassword')).rejects.toSatisfy(
      (error: unknown) => error instanceof AppApiError && error.statusCode === 401,
    );
  });

  it('preserves the backend error message on a 401', async () => {
    const backendMessage = 'Invalid email or password';
    fakeApi({
      'POST /auth/login': () => reply(401, buildUnauthorizedErrorBody(backendMessage)),
    });

    const thrownError = await loginWithEmailAndPassword('amaka@azurebay.test', 'wrong').catch(
      (error: unknown) => error,
    );

    expect(thrownError).toBeInstanceOf(AppApiError);
    expect((thrownError as AppApiError).message).toBe(backendMessage);
  });

  it('throws a network AppApiError when the server is unreachable', async () => {
    fakeApi({
      'POST /auth/login': () => {
        throw new Error('Failed to fetch');
      },
    });

    const thrownError = await loginWithEmailAndPassword('amaka@azurebay.test', 'ChangeMe123!').catch(
      (error: unknown) => error,
    );

    expect(thrownError).toBeInstanceOf(AppApiError);
    expect((thrownError as AppApiError).statusCode).toBe(0);
  });

  it('returns all token response fields from the server', async () => {
    const serverUser = staffUser('MANAGER');
    fakeApi({
      'POST /auth/login': () => ({
        accessToken: 'at-manager',
        refreshToken: 'rt-manager',
        expiresIn: 900,
        user: serverUser,
      }),
    });

    const tokenResponse = await loginWithEmailAndPassword('manager@azurebay.test', 'pass');

    expect(tokenResponse.user.role).toBe('MANAGER');
    expect(tokenResponse.user.hotelId).toBe(HOTEL.id);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// refreshAuthTokens
// ──────────────────────────────────────────────────────────────────────────────

describe('refreshAuthTokens', () => {
  it('sends the current refresh token to POST /auth/refresh and returns fresh tokens', async () => {
    const { calls } = fakeApi({
      'POST /auth/refresh': () =>
        buildTokenResponse({
          accessToken: 'at-new',
          refreshToken: NEXT_REFRESH_TOKEN_VALUE,
        }),
    });

    const freshTokenResponse = await refreshAuthTokens(REFRESH_TOKEN_VALUE);

    expect(freshTokenResponse.accessToken).toBe('at-new');
    expect(freshTokenResponse.refreshToken).toBe(NEXT_REFRESH_TOKEN_VALUE);

    const refreshCall = calls.find((call) => call.method === 'POST' && call.path === '/auth/refresh');
    expect(refreshCall?.body).toEqual({ refreshToken: REFRESH_TOKEN_VALUE });
  });

  it('does NOT attach an Authorization header (unauthenticated endpoint)', async () => {
    const { calls } = fakeApi({
      'POST /auth/refresh': () => buildTokenResponse(),
    });

    await refreshAuthTokens(REFRESH_TOKEN_VALUE);

    const refreshCall = calls.find((call) => call.method === 'POST' && call.path === '/auth/refresh');
    expect(refreshCall?.authorization).toBeNull();
  });

  it('throws AppApiError 401 when the refresh token is revoked or expired', async () => {
    fakeApi({
      'POST /auth/refresh': () =>
        reply(401, { error: { code: 'UNAUTHORIZED', message: 'Refresh token has been revoked' } }),
    });

    await expect(refreshAuthTokens('revoked-refresh-token')).rejects.toSatisfy(
      (error: unknown) => error instanceof AppApiError && error.statusCode === 401,
    );
  });

  it('preserves the backend error message when a revoked refresh token is reused', async () => {
    const revokedTokenMessage = 'Refresh token has been revoked';
    fakeApi({
      'POST /auth/refresh': () =>
        reply(401, { error: { code: 'UNAUTHORIZED', message: revokedTokenMessage } }),
    });

    const thrownError = await refreshAuthTokens('stale-token').catch((error: unknown) => error);

    expect(thrownError).toBeInstanceOf(AppApiError);
    expect((thrownError as AppApiError).message).toBe(revokedTokenMessage);
  });

  it('rotates the refresh token — new token differs from the submitted one', async () => {
    fakeApi({
      'POST /auth/refresh': () =>
        buildTokenResponse({ refreshToken: NEXT_REFRESH_TOKEN_VALUE }),
    });

    const freshTokens = await refreshAuthTokens(REFRESH_TOKEN_VALUE);

    expect(freshTokens.refreshToken).not.toBe(REFRESH_TOKEN_VALUE);
    expect(freshTokens.refreshToken).toBe(NEXT_REFRESH_TOKEN_VALUE);
  });

  it('includes the updated user profile in the token response', async () => {
    const updatedUser = staffUser('ADMIN');
    fakeApi({
      'POST /auth/refresh': () => buildTokenResponse({ user: updatedUser }),
    });

    const freshTokens = await refreshAuthTokens(REFRESH_TOKEN_VALUE);

    expect(freshTokens.user.role).toBe('ADMIN');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// logoutFromServer
// ──────────────────────────────────────────────────────────────────────────────

describe('logoutFromServer', () => {
  it('sends the refresh token to POST /auth/logout and resolves with no value', async () => {
    const { calls } = fakeApi({
      'POST /auth/logout': () => reply(204),
    });

    const result = await logoutFromServer(REFRESH_TOKEN_VALUE);

    expect(result).toBeUndefined();

    const logoutCall = calls.find((call) => call.method === 'POST' && call.path === '/auth/logout');
    expect(logoutCall).toBeDefined();
    expect(logoutCall?.body).toEqual({ refreshToken: REFRESH_TOKEN_VALUE });
  });

  it('does NOT attach an Authorization header (unauthenticated endpoint)', async () => {
    const { calls } = fakeApi({
      'POST /auth/logout': () => reply(204),
    });

    await logoutFromServer(REFRESH_TOKEN_VALUE);

    const logoutCall = calls.find((call) => call.method === 'POST' && call.path === '/auth/logout');
    expect(logoutCall?.authorization).toBeNull();
  });

  it('throws AppApiError when the server returns a non-2xx status', async () => {
    fakeApi({
      'POST /auth/logout': () =>
        reply(401, { error: { code: 'UNAUTHORIZED', message: 'Token already revoked' } }),
    });

    await expect(logoutFromServer('already-revoked-token')).rejects.toBeInstanceOf(AppApiError);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// fetchCurrentStaffUser
// ──────────────────────────────────────────────────────────────────────────────

describe('fetchCurrentStaffUser', () => {
  beforeEach(() => {
    // fetchCurrentStaffUser uses the authenticated client, which reads the
    // access token from session to populate the Authorization header.
    session.store({ accessToken: ACCESS_TOKEN_VALUE, refreshToken: REFRESH_TOKEN_VALUE });
  });

  it('fetches the authenticated user profile from GET /auth/me', async () => {
    const currentUser = staffUser('RECEPTIONIST');
    const { calls } = fakeApi({
      'GET /auth/me': () => currentUser,
    });

    const returnedUser = await fetchCurrentStaffUser();

    expect(returnedUser.id).toBe(currentUser.id);
    expect(returnedUser.email).toBe(currentUser.email);
    expect(returnedUser.role).toBe('RECEPTIONIST');

    const meCall = calls.find((call) => call.method === 'GET' && call.path === '/auth/me');
    expect(meCall).toBeDefined();
  });

  it('attaches the access token as a Bearer Authorization header', async () => {
    const { calls } = fakeApi({
      'GET /auth/me': () => staffUser(),
      // The 401 interceptor in api-client.ts will attempt a refresh if /auth/me returns 401;
      // provide a refresh stub so the interceptor can proceed if it fires.
      'POST /auth/refresh': () =>
        buildTokenResponse({ accessToken: 'at-refreshed', refreshToken: 'rt-new' }),
    });

    await fetchCurrentStaffUser();

    const meCall = calls.find((call) => call.method === 'GET' && call.path === '/auth/me');
    expect(meCall?.authorization).toBe(`Bearer ${ACCESS_TOKEN_VALUE}`);
  });

  it('throws AppApiError 401 when there is no valid session', async () => {
    session.clear();
    fakeApi({
      'GET /auth/me': () =>
        reply(401, { error: { code: 'UNAUTHORIZED', message: 'No active session' } }),
      'POST /auth/refresh': () =>
        reply(401, { error: { code: 'UNAUTHORIZED', message: 'No refresh token' } }),
    });

    const thrownError = await fetchCurrentStaffUser().catch((error: unknown) => error);

    expect(thrownError).toBeInstanceOf(AppApiError);
    expect((thrownError as AppApiError).statusCode).toBe(401);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// validateStaffLoginCredentials — pure function, no network needed
// ──────────────────────────────────────────────────────────────────────────────

import { validateStaffLoginCredentials } from '../src/features/auth/types';

describe('validateStaffLoginCredentials (pure validation logic)', () => {

  it('returns isValid: true with trimmed data for a valid email and non-empty password', () => {
    const result = validateStaffLoginCredentials('  amaka@azurebay.test  ', 'ChangeMe123!');

    expect(result.isValid).toBe(true);
    if (result.isValid) {
      expect(result.data.emailAddress).toBe('amaka@azurebay.test');
      expect(result.data.plainTextPassword).toBe('ChangeMe123!');
    }
  });

  it('returns isValid: false with an emailAddress error when the email is empty', () => {
    const result = validateStaffLoginCredentials('', 'ChangeMe123!');

    expect(result.isValid).toBe(false);
    if (!result.isValid) {
      expect(result.fieldErrors.emailAddress).toBeTruthy();
      expect(result.fieldErrors.plainTextPassword).toBeUndefined();
    }
  });

  it('returns isValid: false with an emailAddress error when the @ sign is missing', () => {
    const result = validateStaffLoginCredentials('notanemail', 'ChangeMe123!');

    expect(result.isValid).toBe(false);
    if (!result.isValid) {
      expect(result.fieldErrors.emailAddress).toMatch(/valid email/i);
    }
  });

  it('returns isValid: false when the email starts with @', () => {
    const result = validateStaffLoginCredentials('@nodomain.com', 'ChangeMe123!');

    expect(result.isValid).toBe(false);
    if (!result.isValid) {
      expect(result.fieldErrors.emailAddress).toBeTruthy();
    }
  });

  it('returns isValid: false with a plainTextPassword error when the password is empty', () => {
    const result = validateStaffLoginCredentials('amaka@azurebay.test', '');

    expect(result.isValid).toBe(false);
    if (!result.isValid) {
      expect(result.fieldErrors.plainTextPassword).toBeTruthy();
      expect(result.fieldErrors.emailAddress).toBeUndefined();
    }
  });

  it('returns field errors for both fields when both are empty', () => {
    const result = validateStaffLoginCredentials('', '');

    expect(result.isValid).toBe(false);
    if (!result.isValid) {
      expect(result.fieldErrors.emailAddress).toBeTruthy();
      expect(result.fieldErrors.plainTextPassword).toBeTruthy();
    }
  });
});
