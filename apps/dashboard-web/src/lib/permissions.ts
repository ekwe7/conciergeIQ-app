import { STAFF_ROLES_IN_ORDER, type StaffRole } from './api-types';

/**
 * Mirrors the backend's role table (identity/domain/permissions.ts) so the
 * dashboard only shows what a role can use. The API enforces it regardless.
 */
export const Permission = {
  VIEW_AND_UPDATE_ORDERS: 'VIEW_AND_UPDATE_ORDERS',
  VIEW_MENU: 'VIEW_MENU',
  MARK_ITEMS_UNAVAILABLE: 'MARK_ITEMS_UNAVAILABLE',
  RECORD_PAYMENTS: 'RECORD_PAYMENTS',
  CHECK_GUESTS_IN_AND_OUT: 'CHECK_GUESTS_IN_AND_OUT',
  VIEW_ROOMS: 'VIEW_ROOMS',
  EDIT_MENU: 'EDIT_MENU',
  MANAGE_STAFF: 'MANAGE_STAFF',
  VIEW_ACTIVITY_LOG: 'VIEW_ACTIVITY_LOG',
  MANAGE_ROOMS_AND_QR_CODES: 'MANAGE_ROOMS_AND_QR_CODES',
  MANAGE_HOTEL_SETTINGS: 'MANAGE_HOTEL_SETTINGS',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

const MINIMUM_ROLE: Record<Permission, StaffRole> = {
  VIEW_AND_UPDATE_ORDERS: 'STAFF',
  VIEW_MENU: 'STAFF',
  MARK_ITEMS_UNAVAILABLE: 'RECEPTIONIST',
  RECORD_PAYMENTS: 'RECEPTIONIST',
  CHECK_GUESTS_IN_AND_OUT: 'RECEPTIONIST',
  VIEW_ROOMS: 'RECEPTIONIST',
  EDIT_MENU: 'MANAGER',
  MANAGE_STAFF: 'MANAGER',
  VIEW_ACTIVITY_LOG: 'MANAGER',
  MANAGE_ROOMS_AND_QR_CODES: 'ADMIN',
  MANAGE_HOTEL_SETTINGS: 'ADMIN',
};

const rank = (role: StaffRole): number => STAFF_ROLES_IN_ORDER.indexOf(role);

export function roleCan(role: StaffRole, permission: Permission): boolean {
  return rank(role) >= rank(MINIMUM_ROLE[permission]);
}

/** Admins manage everyone; managers only manage roles below their own. */
export function canManageRole(actorRole: StaffRole, targetRole: StaffRole): boolean {
  if (actorRole === 'ADMIN') return true;
  return roleCan(actorRole, Permission.MANAGE_STAFF) && rank(targetRole) < rank(actorRole);
}

export const ROLE_LABEL: Record<StaffRole, string> = {
  STAFF: 'Staff',
  RECEPTIONIST: 'Receptionist',
  MANAGER: 'Manager',
  ADMIN: 'Admin',
};
