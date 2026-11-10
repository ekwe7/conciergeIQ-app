import { useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider';
import { roleCan, type Permission } from '../../lib/permissions';
import { Spinner } from '../ui/Button';

export interface AccessDeniedLocationState {
  accessDenied?: boolean;
  statusCode?: number;
  forbiddenPath?: string;
  requiredPermission?: Permission;
  message?: string;
}

export interface AccessDeniedBannerProperties {
  forbiddenPath?: string;
  message?: string;
  onDismiss?: () => void;
}

/**
 * 403 Forbidden alert banner displayed when a staff member is redirected
 * to Live Orders after attempting to access a route above their role rank.
 */
export function AccessDeniedBanner({
  forbiddenPath,
  message = 'You do not have access to this page',
  onDismiss,
}: AccessDeniedBannerProperties) {
  return (
    <div
      role="alert"
      data-testid="access-denied-banner"
      className="mb-6 flex items-start justify-between gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-ink"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex shrink-0 items-center rounded bg-danger px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
          403 Forbidden
        </span>
        <div>
          <p className="font-semibold text-ink">{message}</p>
          <p className="mt-0.5 text-xs text-ink-2">
            Ask a manager if you need it for your work.
            {forbiddenPath ? ` (Restricted path: ${forbiddenPath})` : ''}
          </p>
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss access alert"
          className="rounded px-2 py-1 text-xs font-medium text-ink-3 hover:bg-surface hover:text-ink transition-colors"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

export interface ProtectedRouteProperties {
  children?: ReactNode;
  /** Minimum permission required to view the route. */
  permission?: Permission;
  /** Alias for `permission` to support callers passing `requiredPermission`. */
  requiredPermission?: Permission;
  /** Destination route when a signed-in user lacks permission. Defaults to `/dashboard/orders`. */
  redirectTo?: string;
  /** Whether this guard instance should render the 403 banner upon redirect arrival. Defaults to true. */
  renderAccessBanner?: boolean;
}

/**
 * Route guard that enforces staff authentication and cumulative RBAC permissions.
 *
 * - While session restoration is in progress, renders a loading status indicator.
 * - When signed out, redirects to `/login` preserving the intended destination.
 * - When signed in without the required permission, redirects to `/dashboard/orders`
 *   with a 403 access-denied state payload so the user sees an explanatory alert banner.
 */
export function ProtectedRoute({
  children,
  permission,
  requiredPermission,
  redirectTo = '/dashboard/orders',
  renderAccessBanner = true,
}: ProtectedRouteProperties) {
  const { state } = useAuth();
  const location = useLocation();
  const [dismissedForbiddenPath, setDismissedForbiddenPath] = useState<string | null>(null);

  if (state.status === 'restoring') {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center gap-2 text-sm text-ink-3"
      >
        <Spinner /> Restoring your session
      </div>
    );
  }

  if (state.status === 'signed-out') {
    const intendedDestination = state.deliberate
      ? undefined
      : location.pathname + location.search;
    return (
      <Navigate
        to="/login"
        replace
        state={intendedDestination ? { from: intendedDestination } : undefined}
      />
    );
  }

  const effectivePermission = requiredPermission ?? permission;
  if (effectivePermission && !roleCan(state.user.role, effectivePermission)) {
    const accessDeniedState: AccessDeniedLocationState = {
      accessDenied: true,
      statusCode: 403,
      forbiddenPath: location.pathname,
      requiredPermission: effectivePermission,
      message: 'You do not have access to this page',
    };
    return <Navigate to={redirectTo} replace state={accessDeniedState} />;
  }

  const locationState = location.state as AccessDeniedLocationState | null;
  const currentForbiddenPathKey = locationState?.forbiddenPath ?? location.pathname;
  const shouldRenderAccessBanner =
    renderAccessBanner &&
    Boolean(locationState?.accessDenied || locationState?.statusCode === 403) &&
    dismissedForbiddenPath !== currentForbiddenPathKey;

  return (
    <>
      {shouldRenderAccessBanner && (
        <AccessDeniedBanner
          forbiddenPath={locationState?.forbiddenPath}
          message={locationState?.message}
          onDismiss={() => setDismissedForbiddenPath(currentForbiddenPathKey)}
        />
      )}
      {children ?? <Outlet />}
    </>
  );
}
