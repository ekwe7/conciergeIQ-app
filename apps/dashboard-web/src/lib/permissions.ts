import { StaffRole } from '@conciergeiq/contracts';

/**
 * Hierarchical ordering of staff roles from lowest to highest privilege:
 * STAFF ⊂ RECEPTIONIST ⊂ MANAGER ⊂ ADMIN
 */
export const STAFF_ROLES_IN_ORDER: readonly StaffRole[] = [
  StaffRole.STAFF,
  StaffRole.RECEPTIONIST,
  StaffRole.MANAGER,
  StaffRole.ADMIN,
];

/**
 * Mirrors the backend's role table (identity/domain/permissions.ts) so the
 * dashboard only shows what a role can use. The API enforces it regardless.
 */
export const Permission = {
  VIEW_AND_UPDATE_ORDERS: 'VIEW_AND_UPDATE_ORDERS',
  VIEW_ROOMS: 'VIEW_ROOMS',
  CHECK_GUESTS_IN_AND_OUT: 'CHECK_GUESTS_IN_AND_OUT',
  MARK_ITEMS_UNAVAILABLE: 'MARK_ITEMS_UNAVAILABLE',
  RECORD_PAYMENTS: 'RECORD_PAYMENTS',
  EDIT_MENU: 'EDIT_MENU',
  MANAGE_STAFF: 'MANAGE_STAFF',
  VIEW_ACTIVITY_LOG: 'VIEW_ACTIVITY_LOG',
  MANAGE_ROOMS_AND_QR_CODES: 'MANAGE_ROOMS_AND_QR_CODES',
  MANAGE_HOTEL_SETTINGS: 'MANAGE_HOTEL_SETTINGS',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

/**
 * Minimum role required for each permission in the cumulative RBAC hierarchy.
 */
export const MINIMUM_ROLE: Record<Permission, StaffRole> = {
  [Permission.VIEW_AND_UPDATE_ORDERS]: StaffRole.STAFF,
  [Permission.VIEW_ROOMS]: StaffRole.RECEPTIONIST,
  [Permission.CHECK_GUESTS_IN_AND_OUT]: StaffRole.RECEPTIONIST,
  [Permission.MARK_ITEMS_UNAVAILABLE]: StaffRole.RECEPTIONIST,
  [Permission.RECORD_PAYMENTS]: StaffRole.RECEPTIONIST,
  [Permission.EDIT_MENU]: StaffRole.MANAGER,
  [Permission.MANAGE_STAFF]: StaffRole.MANAGER,
  [Permission.VIEW_ACTIVITY_LOG]: StaffRole.MANAGER,
  [Permission.MANAGE_ROOMS_AND_QR_CODES]: StaffRole.ADMIN,
  [Permission.MANAGE_HOTEL_SETTINGS]: StaffRole.ADMIN,
};

/**
 * Returns the numerical index of a role in the cumulative role hierarchy.
 */
export function getRoleRank(staffRole: StaffRole): number {
  return STAFF_ROLES_IN_ORDER.indexOf(staffRole);
}

/**
 * Evaluates whether a given staff role satisfies the minimum role requirement
 * for the specified permission.
 */
export function roleCan(staffRole: StaffRole, requiredPermission: Permission): boolean {
  const actorRoleRank = getRoleRank(staffRole);
  const minimumRequiredRoleRank = getRoleRank(MINIMUM_ROLE[requiredPermission]);
  if (actorRoleRank === -1 || minimumRequiredRoleRank === -1) {
    return false;
  }
  return actorRoleRank >= minimumRequiredRoleRank;
}

/**
 * Admins manage everyone; managers only manage roles strictly below their own.
 */
export function canManageRole(actorRole: StaffRole, targetRole: StaffRole): boolean {
  if (actorRole === StaffRole.ADMIN) {
    return true;
  }
  return (
    roleCan(actorRole, Permission.MANAGE_STAFF) &&
    getRoleRank(targetRole) < getRoleRank(actorRole)
  );
}

export const ROLE_LABEL: Record<StaffRole, string> = {
  [StaffRole.STAFF]: 'Staff',
  [StaffRole.RECEPTIONIST]: 'Receptionist',
  [StaffRole.MANAGER]: 'Manager',
  [StaffRole.ADMIN]: 'Admin',
};
