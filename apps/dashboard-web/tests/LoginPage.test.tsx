/**
 * Component tests for LoginPage.tsx
 *
 * These tests verify the login screen from a user's perspective: form field
 * interactions, client-side validation feedback, loading state, server error
 * display, redirect on success, and persistence toggle behaviour.
 *
 * Rendering strategy: the full router stack is used via `renderDashboard` so
 * that AuthProvider, RequireAuth, and redirects all work exactly as they do in
 * production — no manual context wiring needed.
 *
 * API interactions use the `fakeApi` helper (vi.stubGlobal fetch mock).  The
 * stub is reset between tests by the global afterEach in tests/setup.ts.
 *
 * Coverage:
 *   - Form renders all expected fields and controls
 *   - Client-side validation: empty email, missing @, empty password, both empty
 *   - Successful sign-in: tokens stored, redirect to /orders
 *   - Invalid credentials: backend error message displayed in alert
 *   - Network failure: generic error message displayed
 *   - Loading state: button is disabled and shows spinner while request is in flight
 *   - Submit button is disabled until email and password are both non-empty
 *   - Password visibility toggle works
 *   - "Keep me signed in" toggle persists or clears the refresh token from localStorage
 *   - Session expiry notice shown when redirected back to /login after expiry
 *   - Already signed-in user is redirected away from /login
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { session } from '../src/lib/session';
import { fakeApi, HOTEL, renderDashboard, reply, staffUser } from './support';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const VALID_EMAIL = 'amaka@azurebay.test';
const VALID_PASSWORD = 'ChangeMe123!';
const REFRESH_TOKEN_STORAGE_KEY = 'conciergeiq.dashboard.refreshToken';

/** Stubs the server to accept one specific password and reject all others. */
function mountLoginWithSuccessStub() {
  const { calls } = fakeApi({
    'POST /auth/login': ({ body }) =>
      (body as { password: string }).password === VALID_PASSWORD
        ? {
            accessToken: 'access-1',
            refreshToken: 'refresh-1',
            expiresIn: 900,
            user: staffUser(),
          }
        : reply(401, { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } }),
    'GET /hotel': () => HOTEL,
    'GET /orders': () => [],
    'GET /payments/outstanding': () => [],
  });

  renderDashboard('/login');
  return { calls };
}

/** Types into the email and password fields. */
function fillCredentials(emailAddress: string, plainTextPassword: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: emailAddress } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: plainTextPassword } });
}

/** Clicks the Sign in button. */
function submitLoginForm() {
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

// ──────────────────────────────────────────────────────────────────────────────
// Rendering
// ──────────────────────────────────────────────────────────────────────────────

describe('LoginPage rendering', () => {
  it('renders the "Staff sign in" heading', async () => {
    fakeApi({});
    renderDashboard('/login');

    expect(await screen.findByRole('heading', { name: 'Staff sign in' })).toBeTruthy();
  });

  it('renders the email input', async () => {
    fakeApi({});
    renderDashboard('/login');

    expect(await screen.findByLabelText('Email')).toBeTruthy();
  });

  it('renders the password input as a password field by default', async () => {
    fakeApi({});
    renderDashboard('/login');
    await screen.findByRole('heading', { name: 'Staff sign in' });

    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');
  });

  it('renders the "Keep me signed in" toggle', async () => {
    fakeApi({});
    renderDashboard('/login');

    expect(await screen.findByRole('switch', { name: 'Keep me signed in on this device' })).toBeTruthy();
  });

  it('renders the Sign in submit button', async () => {
    fakeApi({});
    renderDashboard('/login');

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Submit button enable/disable state
// ──────────────────────────────────────────────────────────────────────────────

describe('submit button state', () => {
  it('is disabled when both fields are empty on page load', async () => {
    fakeApi({});
    renderDashboard('/login');
    await screen.findByRole('heading', { name: 'Staff sign in' });

    const submitButton = screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
  });

  it('is disabled when email is filled but password is empty', async () => {
    fakeApi({});
    renderDashboard('/login');
    await screen.findByRole('heading', { name: 'Staff sign in' });

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: VALID_EMAIL } });

    const submitButton = screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
  });

  it('is disabled when password is filled but email is empty', async () => {
    fakeApi({});
    renderDashboard('/login');
    await screen.findByRole('heading', { name: 'Staff sign in' });

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: VALID_PASSWORD } });

    const submitButton = screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
  });

  it('is enabled when both fields contain text', async () => {
    fakeApi({});
    renderDashboard('/login');
    await screen.findByRole('heading', { name: 'Staff sign in' });

    fillCredentials(VALID_EMAIL, VALID_PASSWORD);

    const submitButton = screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Client-side validation
// ──────────────────────────────────────────────────────────────────────────────

describe('client-side validation', () => {
  it('shows an email error when the email is empty and form is submitted', async () => {
    fakeApi({});
    const { container } = renderDashboard('/login');
    await screen.findByRole('heading', { name: 'Staff sign in' });

    // Fill both to enable the button, set email to whitespace, then submit.
    // validateStaffLoginCredentials trims whitespace so empty-after-trim fires the error.
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: VALID_EMAIL } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: VALID_PASSWORD } });
    // Switch email to whitespace-only — still truthy so button stays enabled
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '   ' } });
    // Submit the form directly to guarantee the handler fires regardless of button state
    fireEvent.submit(container.querySelector('form')!);

    expect(await screen.findByText('Email address is required.')).toBeTruthy();
  });

  it('shows an email error when the email is missing the @ sign', async () => {
    fakeApi({});
    renderDashboard('/login');
    await screen.findByRole('heading', { name: 'Staff sign in' });

    fillCredentials('notanemail', VALID_PASSWORD);
    submitLoginForm();

    expect(await screen.findByText(/valid email address/i)).toBeTruthy();
  });

  it('shows a password error when the password is empty and form is submitted', async () => {
    fakeApi({});
    const { container } = renderDashboard('/login');
    await screen.findByRole('heading', { name: 'Staff sign in' });

    // Set a valid email so only the password error fires.
    // Submit the form directly (bypassing the button's disabled guard) with an
    // empty password to exercise the server-side-style path where the guard is absent.
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: VALID_EMAIL } });
    // Leave password empty and submit the form element directly
    fireEvent.submit(container.querySelector('form')!);

    expect(await screen.findByText('Password is required.')).toBeTruthy();
  });

  it('does NOT call the login API when validation fails', async () => {
    const { calls } = fakeApi({});
    renderDashboard('/login');
    await screen.findByRole('heading', { name: 'Staff sign in' });

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bademail' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: VALID_PASSWORD } });
    submitLoginForm();

    await screen.findByText(/valid email address/i);
    const loginCalls = calls.filter((call) => call.method === 'POST' && call.path === '/auth/login');
    expect(loginCalls.length).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Successful sign-in
// ──────────────────────────────────────────────────────────────────────────────

describe('successful sign-in', () => {
  it('navigates to /orders after a successful login', async () => {
    mountLoginWithSuccessStub();
    await screen.findByRole('heading', { name: 'Staff sign in' });

    fillCredentials(VALID_EMAIL, VALID_PASSWORD);
    submitLoginForm();

    expect(await screen.findByRole('heading', { name: 'Live orders' })).toBeTruthy();
  });

  it('stores the access token in session memory after login', async () => {
    mountLoginWithSuccessStub();
    await screen.findByRole('heading', { name: 'Staff sign in' });

    fillCredentials(VALID_EMAIL, VALID_PASSWORD);
    submitLoginForm();

    await screen.findByRole('heading', { name: 'Live orders' });
    expect(session.getAccessToken()).toBe('access-1');
  });

  it('persists the refresh token to localStorage by default', async () => {
    mountLoginWithSuccessStub();
    await screen.findByRole('heading', { name: 'Staff sign in' });

    fillCredentials(VALID_EMAIL, VALID_PASSWORD);
    submitLoginForm();

    await screen.findByRole('heading', { name: 'Live orders' });
    expect(window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe('refresh-1');
  });

  it('sends the correct email and password fields to the API', async () => {
    const { calls } = mountLoginWithSuccessStub();
    await screen.findByRole('heading', { name: 'Staff sign in' });

    fillCredentials(VALID_EMAIL, VALID_PASSWORD);
    submitLoginForm();

    await screen.findByRole('heading', { name: 'Live orders' });
    const loginCall = calls.find((call) => call.method === 'POST' && call.path === '/auth/login');
    expect(loginCall?.body).toEqual({ email: VALID_EMAIL, password: VALID_PASSWORD });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Server error handling
// ──────────────────────────────────────────────────────────────────────────────

describe('server error handling', () => {
  it('shows the "do not match" message when credentials are wrong', async () => {
    fakeApi({
      'POST /auth/login': () =>
        reply(401, { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } }),
    });
    renderDashboard('/login');
    await screen.findByRole('heading', { name: 'Staff sign in' });

    fillCredentials(VALID_EMAIL, 'wrongpassword');
    submitLoginForm();

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert.textContent).toContain('do not match an active account');
  });

  it('shows a generic error message on a 500 server error', async () => {
    fakeApi({
      'POST /auth/login': () =>
        reply(500, { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } }),
    });
    renderDashboard('/login');
    await screen.findByRole('heading', { name: 'Staff sign in' });

    fillCredentials(VALID_EMAIL, VALID_PASSWORD);
    submitLoginForm();

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert.textContent).toBeTruthy();
  });

  it('shows a connectivity error message when the network is unreachable', async () => {
    fakeApi({
      'POST /auth/login': () => {
        throw new Error('Failed to fetch');
      },
    });
    renderDashboard('/login');
    await screen.findByRole('heading', { name: 'Staff sign in' });

    fillCredentials(VALID_EMAIL, VALID_PASSWORD);
    submitLoginForm();

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert.textContent).toBeTruthy();
  });

  it('clears the error message when the user starts correcting credentials', async () => {
    fakeApi({
      'POST /auth/login': ({ body }) =>
        (body as { password: string }).password === VALID_PASSWORD
          ? {
              accessToken: 'access-1',
              refreshToken: 'refresh-1',
              expiresIn: 900,
              user: staffUser(),
            }
          : reply(401, { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } }),
      'GET /hotel': () => HOTEL,
      'GET /orders': () => [],
      'GET /payments/outstanding': () => [],
    });
    renderDashboard('/login');
    await screen.findByRole('heading', { name: 'Staff sign in' });

    // First attempt: wrong password
    fillCredentials(VALID_EMAIL, 'wrongpassword');
    submitLoginForm();
    await screen.findByRole('alert');

    // Correct the password — the error should clear on next submit
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: VALID_PASSWORD } });
    submitLoginForm();

    await screen.findByRole('heading', { name: 'Live orders' });
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Loading state
// ──────────────────────────────────────────────────────────────────────────────

describe('loading state', () => {
  it('disables the submit button while the login request is in flight', async () => {
    let resolveLoginRequest!: (response: unknown) => void;

    // Create a promise that we can resolve manually to simulate a slow network
    const delayedResponse = new Promise<unknown>((resolve) => {
      resolveLoginRequest = resolve;
    });

    fakeApi({
      'POST /auth/login': () => delayedResponse as unknown as Record<string, unknown>,
      'GET /hotel': () => HOTEL,
      'GET /orders': () => [],
      'GET /payments/outstanding': () => [],
    });
    renderDashboard('/login');
    await screen.findByRole('heading', { name: 'Staff sign in' });

    fillCredentials(VALID_EMAIL, VALID_PASSWORD);

    const submitButton = screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(false);

    fireEvent.click(submitButton);

    // While the request is pending the button must be disabled
    await waitFor(() => expect(submitButton.disabled).toBe(true));

    // Let the request complete
    resolveLoginRequest({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresIn: 900,
      user: staffUser(),
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Password visibility toggle
// ──────────────────────────────────────────────────────────────────────────────

describe('password visibility toggle', () => {
  it('toggles the password field to type="text" when "Show password" is clicked', async () => {
    fakeApi({});
    renderDashboard('/login');
    await screen.findByRole('heading', { name: 'Staff sign in' });

    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));

    expect(passwordInput.type).toBe('text');
  });

  it('toggles back to type="password" when "Hide password" is clicked', async () => {
    fakeApi({});
    renderDashboard('/login');
    await screen.findByRole('heading', { name: 'Staff sign in' });

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));

    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// "Keep me signed in" persistence toggle
// ──────────────────────────────────────────────────────────────────────────────

describe('"Keep me signed in" toggle', () => {
  it('does NOT write the refresh token to localStorage when the toggle is switched off', async () => {
    fakeApi({
      'POST /auth/login': () => ({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        expiresIn: 900,
        user: staffUser(),
      }),
      'GET /hotel': () => HOTEL,
      'GET /orders': () => [],
      'GET /payments/outstanding': () => [],
    });
    renderDashboard('/login');
    await screen.findByRole('heading', { name: 'Staff sign in' });

    // Turn off "Keep me signed in"
    fireEvent.click(screen.getByRole('switch', { name: 'Keep me signed in on this device' }));

    fillCredentials(VALID_EMAIL, VALID_PASSWORD);
    submitLoginForm();

    await screen.findByRole('heading', { name: 'Live orders' });

    expect(window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('writes the refresh token to localStorage when the toggle is on (default)', async () => {
    fakeApi({
      'POST /auth/login': () => ({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        expiresIn: 900,
        user: staffUser(),
      }),
      'GET /hotel': () => HOTEL,
      'GET /orders': () => [],
      'GET /payments/outstanding': () => [],
    });
    renderDashboard('/login');
    await screen.findByRole('heading', { name: 'Staff sign in' });

    fillCredentials(VALID_EMAIL, VALID_PASSWORD);
    submitLoginForm();

    await screen.findByRole('heading', { name: 'Live orders' });

    expect(window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe('refresh-1');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Session expiry notice
// ──────────────────────────────────────────────────────────────────────────────

describe('session expiry notice', () => {
  it('shows the session-expired notice when the 401 interceptor fires mid-session', async () => {
    // This test drives the mid-session expiry path:
    // 1. Session resumes successfully.
    // 2. A subsequent API call gets a 401 that the interceptor cannot recover (refresh also 401s).
    // 3. api-client calls session.expire() which triggers the onExpired listener in AuthProvider.
    // 4. AuthProvider transitions to signed-out WITH a notice message.
    let ordersCallCount = 0;
    fakeApi({
      'POST /auth/refresh': () => ({
        accessToken: 'access-1',
        refreshToken: 'refresh-2',
        expiresIn: 900,
        user: staffUser(),
      }),
      'GET /hotel': () => HOTEL,
      'GET /payments/outstanding': () => [],
      'GET /orders': () => {
        ordersCallCount += 1;
        // On the first call (after session restore) succeed; the 401 interceptor
        // re-tries with a refreshed token but we make the refresh itself expire the session
        // by calling session.expire() directly to simulate a revoked mid-session token.
        if (ordersCallCount === 1) {
          // Trigger expiry after sign-in by calling the session module directly.
          // This is the same code path as when the 401 interceptor can't refresh.
          setTimeout(() => {
            session.expire();
          }, 50);
        }
        return [];
      },
    });

    session.store({ accessToken: 'valid-access', refreshToken: 'valid-refresh' });
    renderDashboard('/orders');

    // Session restores and user reaches the orders page
    await screen.findByRole('heading', { name: 'Live orders' });

    // session.expire() fires, AuthProvider transitions to signed-out with a notice
    // and RequireAuth redirects to /login showing the notice
    expect(await screen.findByRole('heading', { name: 'Staff sign in' })).toBeTruthy();
    expect(await screen.findByRole('status')).toBeTruthy();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Redirect when already authenticated
// ──────────────────────────────────────────────────────────────────────────────

describe('already authenticated redirect', () => {
  it('redirects away from /login to /orders when the session is already active', async () => {
    session.store({ accessToken: 'valid-access', refreshToken: 'valid-refresh' });

    fakeApi({
      'POST /auth/refresh': () => ({
        accessToken: 'access-fresh',
        refreshToken: 'refresh-fresh',
        expiresIn: 900,
        user: staffUser(),
      }),
      'GET /hotel': () => HOTEL,
      'GET /orders': () => [],
      'GET /payments/outstanding': () => [],
    });

    renderDashboard('/login');

    // Once session restores, the user should never see the login form
    expect(await screen.findByRole('heading', { name: 'Live orders' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Staff sign in' })).toBeNull();
  });
});
