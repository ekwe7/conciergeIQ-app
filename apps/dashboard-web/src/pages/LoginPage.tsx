/**
 * LoginPage — Staff sign-in screen (UI: 02).
 *
 * Layout: two-panel split screen.
 *   Left  — dark navy marketing panel with the product tagline.
 *   Right — sign-in form with email, password (show/hide), "Keep me signed in"
 *           toggle, loading state, error alert, and a security note.
 *
 * Validation: credentials are checked client-side with StaffLoginSchema (TypeBox)
 * before any network request is made, preventing obviously invalid data from ever
 * reaching the API.
 *
 * Token persistence: the "Keep me signed in on this device" toggle controls whether
 * the refresh token is written to localStorage (persistent across browser restarts)
 * or kept only in memory (cleared when the user closes the browser).
 */

import { AppApiError } from '@conciergeiq/utils';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Field, FormError, Input } from '../components/ui/Field';
import { Switch } from '../components/ui/Switch';
import { useAuth } from '../features/auth/AuthProvider';
import { validateStaffLoginCredentials } from '../features/auth/types';
import { describeError } from '../lib/error-handler';

export function LoginPage() {
  const { state, signIn } = useAuth();
  const location = useLocation();

  const [emailAddress, setEmailAddress] = useState('');
  const [plainTextPassword, setPlainTextPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ emailAddress?: string; plainTextPassword?: string }>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmissionPending, setIsSubmissionPending] = useState(false);

  // If the user is already signed in, redirect to their intended destination.
  if (state.status === 'signed-in') {
    const intendedPath = (location.state as { from?: string } | null)?.from;
    return <Navigate to={intendedPath && intendedPath !== '/login' ? intendedPath : '/orders'} replace />;
  }

  const sessionExpiryNotice = state.status === 'signed-out' ? state.notice : undefined;

  async function handleFormSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setSubmissionError(null);
    setFieldErrors({});

    const validationResult = validateStaffLoginCredentials(emailAddress, plainTextPassword);
    if (!validationResult.isValid) {
      setFieldErrors(validationResult.fieldErrors);
      return;
    }

    setIsSubmissionPending(true);
    try {
      await signIn(validationResult.data.emailAddress, validationResult.data.plainTextPassword, keepSignedIn);
    } catch (caughtError) {
      setSubmissionError(
        caughtError instanceof AppApiError && caughtError.statusCode === 401
          ? 'That email and password do not match an active account.'
          : describeError(caughtError),
      );
      setIsSubmissionPending(false);
    }
  }

  function handlePasswordVisibilityToggle() {
    setIsPasswordVisible((currentVisibility) => !currentVisibility);
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left branding panel ───────────────────────────────────────────────── */}
      <div
        className="relative hidden overflow-hidden lg:flex lg:w-1/2 lg:flex-col lg:p-16"
        style={{ backgroundColor: '#1b2a3a', color: '#ffffff' }}
      >
        {/* Decorative radial glow — matches the design spec */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -right-32 h-[520px] w-[520px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(211,160,80,0.35), transparent 70%)',
          }}
        />

        {/* Logo row */}
        <div className="relative flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: '#d3a050' }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-white"
            >
              <path d="M3 18h18M5 18a7 7 0 0 1 14 0M12 8V6M10 6h4" />
            </svg>
          </span>
          <span className="text-[17px] font-semibold">
            Concierge<span style={{ color: '#d3a050' }}>IQ</span>
          </span>
        </div>

        {/* Marketing tagline */}
        <div className="relative mt-auto">
          <h1
            className="text-5xl font-semibold leading-[1.08]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Every request.<br />Every room.<br />In real time.
          </h1>
          <p className="mt-4 max-w-md text-base" style={{ color: '#c9cfdf' }}>
            Sign in to see live orders, manage stays and keep your guests happy.
          </p>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-canvas px-6 py-16">
        <div className="w-full max-w-sm">
          {/* Session-expiry notice (shown after a forced sign-out) */}
          {sessionExpiryNotice && (
            <p
              role="status"
              className="mb-6 rounded border border-notice-line bg-notice px-3 py-2 text-[13px] text-ink-2"
            >
              {sessionExpiryNotice}
            </p>
          )}

          <h2
            className="text-[30px] font-semibold leading-tight"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Staff sign in
          </h2>
          <p className="mt-1 text-sm text-ink-3">
            Use the account your hotel admin created for you.
          </p>

          <form onSubmit={handleFormSubmit} noValidate className="mt-6 space-y-4">
            {/* Email field */}
            <Field label="Email" error={fieldErrors.emailAddress}>
              <Input
                type="email"
                autoComplete="username"
                required
                value={emailAddress}
                onChange={(changeEvent) => setEmailAddress(changeEvent.target.value)}
                data-autofocus
                placeholder="reception@azurebay.ng"
              />
            </Field>

            {/* Password field with show/hide toggle */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-[13px] font-medium text-ink">Password</label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={plainTextPassword}
                  onChange={(changeEvent) => setPlainTextPassword(changeEvent.target.value)}
                  aria-invalid={fieldErrors.plainTextPassword ? true : undefined}
                  aria-describedby={fieldErrors.plainTextPassword ? 'login-password-error' : undefined}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={handlePasswordVisibilityToggle}
                  aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  tabIndex={0}
                >
                  {isPasswordVisible ? (
                    <EyeOff aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Eye aria-hidden="true" className="h-4 w-4" />
                  )}
                </button>
              </div>
              {fieldErrors.plainTextPassword && (
                <p id="login-password-error" className="text-xs text-danger">{fieldErrors.plainTextPassword}</p>
              )}
            </div>

            {/* "Keep me signed in" persistence toggle */}
            <div className="flex items-center gap-2 pt-1">
              <Switch
                checked={keepSignedIn}
                onChange={setKeepSignedIn}
                label="Keep me signed in on this device"
              />
              <span className="text-sm text-ink-2" aria-hidden="true">
                Keep me signed in on this device
              </span>
            </div>

            {/* Form-level error (wrong credentials, network failure, etc.) */}
            <FormError>{submissionError}</FormError>

            {/* Submit button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              pending={isSubmissionPending}
              disabled={!emailAddress || !plainTextPassword}
            >
              Sign in
            </Button>
          </form>

          {/* Security information note */}
          <div className="mt-4 flex items-start gap-2 rounded border border-[#c3d4eb] bg-[#edf3f9] px-3 py-2.5">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: '#3d5f8a' }}
            />
            <p className="text-xs" style={{ color: '#3d5f8a' }}>
              Short-lived access tokens with rotating refresh. Sessions end when an admin
              deactivates you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
