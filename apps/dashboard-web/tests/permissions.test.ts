import { StaffRole } from '@conciergeiq/contracts';
import { describe, expect, it } from 'vitest';
import {
  MINIMUM_ROLE,
  Permission,
  ROLE_LABEL,
  STAFF_ROLES_IN_ORDER,
  canManageRole,
  getRoleRank,
  roleCan,
} from '../src/lib/permissions';

interface RolePermissionExpectation {
  staffRole: StaffRole;
  expectedAllowedPermissions: readonly Permission[];
  expectedDeniedPermissions: readonly Permission[];
}

const ALL_PERMISSIONS: readonly Permission[] = [
  Permission.VIEW_AND_UPDATE_ORDERS,
  Permission.VIEW_ROOMS,
  Permission.CHECK_GUESTS_IN_AND_OUT,
  Permission.MARK_ITEMS_UNAVAILABLE,
  Permission.RECORD_PAYMENTS,
  Permission.EDIT_MENU,
  Permission.MANAGE_STAFF,
  Permission.VIEW_ACTIVITY_LOG,
  Permission.MANAGE_ROOMS_AND_QR_CODES,
  Permission.MANAGE_HOTEL_SETTINGS,
];

const ROLE_PERMISSION_MATRIX: readonly RolePermissionExpectation[] = [
  {
    staffRole: StaffRole.STAFF,
    expectedAllowedPermissions: [Permission.VIEW_AND_UPDATE_ORDERS],
    expectedDeniedPermissions: [
      Permission.VIEW_ROOMS,
      Permission.CHECK_GUESTS_IN_AND_OUT,
      Permission.MARK_ITEMS_UNAVAILABLE,
      Permission.RECORD_PAYMENTS,
      Permission.EDIT_MENU,
      Permission.MANAGE_STAFF,
      Permission.VIEW_ACTIVITY_LOG,
      Permission.MANAGE_ROOMS_AND_QR_CODES,
      Permission.MANAGE_HOTEL_SETTINGS,
    ],
  },
  {
    staffRole: StaffRole.RECEPTIONIST,
    expectedAllowedPermissions: [
      Permission.VIEW_AND_UPDATE_ORDERS,
      Permission.VIEW_ROOMS,
      Permission.CHECK_GUESTS_IN_AND_OUT,
      Permission.MARK_ITEMS_UNAVAILABLE,
      Permission.RECORD_PAYMENTS,
    ],
    expectedDeniedPermissions: [
      Permission.EDIT_MENU,
      Permission.MANAGE_STAFF,
      Permission.VIEW_ACTIVITY_LOG,
      Permission.MANAGE_ROOMS_AND_QR_CODES,
      Permission.MANAGE_HOTEL_SETTINGS,
    ],
  },
  {
    staffRole: StaffRole.MANAGER,
    expectedAllowedPermissions: [
      Permission.VIEW_AND_UPDATE_ORDERS,
      Permission.VIEW_ROOMS,
      Permission.CHECK_GUESTS_IN_AND_OUT,
      Permission.MARK_ITEMS_UNAVAILABLE,
      Permission.RECORD_PAYMENTS,
      Permission.EDIT_MENU,
      Permission.MANAGE_STAFF,
      Permission.VIEW_ACTIVITY_LOG,
    ],
    expectedDeniedPermissions: [
      Permission.MANAGE_ROOMS_AND_QR_CODES,
      Permission.MANAGE_HOTEL_SETTINGS,
    ],
  },
  {
    staffRole: StaffRole.ADMIN,
    expectedAllowedPermissions: ALL_PERMISSIONS,
    expectedDeniedPermissions: [],
  },
];

describe('Cumulative RBAC permission evaluation (permissions.ts)', () => {
  it('orders staff roles strictly from lowest to highest privilege', () => {
    expect(STAFF_ROLES_IN_ORDER).toEqual([
      StaffRole.STAFF,
      StaffRole.RECEPTIONIST,
      StaffRole.MANAGER,
      StaffRole.ADMIN,
    ]);

    expect(getRoleRank(StaffRole.STAFF)).toBeLessThan(getRoleRank(StaffRole.RECEPTIONIST));
    expect(getRoleRank(StaffRole.RECEPTIONIST)).toBeLessThan(getRoleRank(StaffRole.MANAGER));
    expect(getRoleRank(StaffRole.MANAGER)).toBeLessThan(getRoleRank(StaffRole.ADMIN));
  });

  it('maps every permission to its authoritative minimum required role', () => {
    expect(MINIMUM_ROLE).toEqual({
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
    });
  });

  describe.each(ROLE_PERMISSION_MATRIX)(
    'permission matrix for role $staffRole',
    ({ staffRole, expectedAllowedPermissions, expectedDeniedPermissions }) => {
      it('covers all 10 canonical permissions without overlap', () => {
        expect(
          expectedAllowedPermissions.length + expectedDeniedPermissions.length,
        ).toBe(ALL_PERMISSIONS.length);
      });

      it.each(expectedAllowedPermissions)(
        'grants $staffRole permission %s',
        (allowedPermission) => {
          expect(roleCan(staffRole, allowedPermission)).toBe(true);
        },
      );

      if (expectedDeniedPermissions.length > 0) {
        it.each(expectedDeniedPermissions)(
          'denies $staffRole permission %s',
          (deniedPermission) => {
            expect(roleCan(staffRole, deniedPermission)).toBe(false);
          },
        );
      }
    },
  );

  describe('canManageRole hierarchy rules', () => {
    it('denies STAFF and RECEPTIONIST from managing any role', () => {
      for (const targetRole of STAFF_ROLES_IN_ORDER) {
        expect(canManageRole(StaffRole.STAFF, targetRole)).toBe(false);
        expect(canManageRole(StaffRole.RECEPTIONIST, targetRole)).toBe(false);
      }
    });

    it('allows MANAGER to manage STAFF and RECEPTIONIST but not MANAGER or ADMIN', () => {
      expect(canManageRole(StaffRole.MANAGER, StaffRole.STAFF)).toBe(true);
      expect(canManageRole(StaffRole.MANAGER, StaffRole.RECEPTIONIST)).toBe(true);
      expect(canManageRole(StaffRole.MANAGER, StaffRole.MANAGER)).toBe(false);
      expect(canManageRole(StaffRole.MANAGER, StaffRole.ADMIN)).toBe(false);
    });

    it('allows ADMIN to manage every staff role including ADMIN', () => {
      for (const targetRole of STAFF_ROLES_IN_ORDER) {
        expect(canManageRole(StaffRole.ADMIN, targetRole)).toBe(true);
      }
    });
  });

  it('provides human-readable labels for every staff role', () => {
    expect(ROLE_LABEL[StaffRole.STAFF]).toBe('Staff');
    expect(ROLE_LABEL[StaffRole.RECEPTIONIST]).toBe('Receptionist');
    expect(ROLE_LABEL[StaffRole.MANAGER]).toBe('Manager');
    expect(ROLE_LABEL[StaffRole.ADMIN]).toBe('Admin');
  });
});
