import type { ReactNode } from 'react';
import type { Permission } from '../../lib/permissions';
import { ProtectedRoute } from './ProtectedRoute';

export { ProtectedRoute };

/** Sends signed-out visitors to the sign-in page, remembering where they were going. */
export function RequireAuth({ children }: { children: ReactNode }) {
  return <ProtectedRoute renderAccessBanner={false}>{children}</ProtectedRoute>;
}

/**
 * Guards a route with a required permission, redirecting unauthorized roles
 * to `/dashboard/orders` with a 403 access alert banner.
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  return <ProtectedRoute permission={permission}>{children}</ProtectedRoute>;
}
