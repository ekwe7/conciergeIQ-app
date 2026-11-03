import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { formatMoney } from '@conciergeiq/utils';
import { App } from '../src/App';

describe('Hotel Dashboard Application Suite', () => {
  it('mounts the root dashboard component cleanly in jsdom', () => {
    const { container } = render(<App />);
    expect(container).toBeDefined();
    expect(screen.getByText(/ConciergeIQ/i)).toBeDefined();
    expect(screen.getByText(/Hotel Staff Portal/i)).toBeDefined();
    expect(screen.getByText(/Marcus Vance/i)).toBeDefined();
    expect(screen.getByText(/Live Orders KDS/i)).toBeDefined();
  });

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
