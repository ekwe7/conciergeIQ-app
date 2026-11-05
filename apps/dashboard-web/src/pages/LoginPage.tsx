import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AppApiError } from '@conciergeiq/utils';
import { Button } from '../components/ui/Button';
import { Field, FormError, Input } from '../components/ui/Field';
import { useAuth } from '../features/auth/AuthProvider';
import { describeError } from '../lib/error-handler';

export function LoginPage() {
  const { state, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (state.status === 'signed-in') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== '/login' ? from : '/orders'} replace />;
  }

  const notice = state.status === 'signed-out' ? state.notice : undefined;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signIn(email, password);
    } catch (caught) {
      // Wrong email and wrong password look the same, on purpose.
      setError(
        caught instanceof AppApiError && caught.statusCode === 401
          ? 'That email and password do not match an active account.'
          : describeError(caught),
      );
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="text-[13px] font-semibold tracking-tight text-ink">ConciergeIQ</p>
        <h1 className="mt-6 text-xl font-semibold tracking-tight text-ink">Sign in</h1>
        <p className="mt-1 text-sm text-ink-3">For hotel staff. Use the account your manager created for you.</p>

        {notice && (
          <p role="status" className="mt-6 rounded border border-notice-line bg-notice px-3 py-2 text-[13px] text-ink-2">
            {notice}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <Field label="Email">
            <Input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              data-autofocus
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <FormError>{error}</FormError>
          <Button type="submit" variant="primary" className="w-full" pending={pending} disabled={!email || !password}>
            Sign in
          </Button>
        </form>

        <p className="mt-8 text-xs text-ink-3">Forgotten your password? Ask a manager to reset it.</p>
      </div>
    </div>
  );
}
