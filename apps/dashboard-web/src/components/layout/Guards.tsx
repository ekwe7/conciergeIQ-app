import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider';
import type { Permission } from '../../lib/permissions';
import { Spinner } from '../ui/Button';

/** Sends signed-out visitors to the sign-in page, remembering where they were going. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === 'restoring') {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center gap-2 text-sm text-ink-3">
        <Spinner /> Restoring your session
      </div>
    );
  }
  if (state.status === 'signed-out') {
    // After an expired session, come back to the same page. After Sign out, the next person starts on the default page.
    const from = state.deliberate ? undefined : location.pathname + location.search;
    return <Navigate to="/login" replace state={from ? { from } : undefined} />;
  }
  return <>{children}</>;
}

/**
 * Hides a page from roles that cannot use it. This is a courtesy: the API
 * refuses the same requests whatever the browser shows.
 */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can } = useAuth();
  if (!can(permission)) {
    return (
      <div className="py-24 text-center">
        <h1 className="text-base font-semibold text-ink">You do not have access to this page</h1>
        <p className="mt-1 text-sm text-ink-3">Ask a manager if you need it for your work.</p>
      </div>
    );
  }
  return <>{children}</>;
}
