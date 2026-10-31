import { describe, it, expect } from 'vitest';
import { formatMoney } from '@conciergeiq/utils';

describe('Hotel Dashboard Application Suite', () => {
  it('formats folio charges accurately', () => {
    expect(formatMoney(5508, 'USD')).toBe('$55.08');
  });

  it('validates role hierarchy permissions', () => {
    const roles = ['STAFF', 'RECEPTIONIST', 'MANAGER', 'ADMIN'];
    const hasManagerPrivileges = (role: string) =>
      ['MANAGER', 'ADMIN'].includes(role);

    expect(hasManagerPrivileges('STAFF')).toBe(false);
    expect(hasManagerPrivileges('MANAGER')).toBe(true);
    expect(hasManagerPrivileges('ADMIN')).toBe(true);
  });
});
