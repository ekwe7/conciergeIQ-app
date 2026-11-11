/**
 * AvailabilityToggleSwitch — Component tests.
 *
 * Verifies:
 *   1. Renders green "Available" and aria-checked=true when item.isAvailable is true.
 *   2. Renders red "Unavailable (86'd)" and aria-checked=false when item.isAvailable is false.
 *   3. Dispatches PATCH /api/v1/menu/items/:id/availability when clicked and triggers success toast.
 *   4. Is disabled for STAFF role without MARK_ITEMS_UNAVAILABLE permission.
 *   5. Is enabled for RECEPTIONIST, MANAGER, and ADMIN roles.
 *   6. Handles network failure with error toast notification and callback.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../src/app/providers';
import { createQueryClient } from '../src/app/query-client';
import { AvailabilityToggleSwitch } from '../src/features/menu/components/AvailabilityToggleSwitch';
import type { MenuItem, StaffRole } from '../src/lib/api-types';
import { session } from '../src/lib/session';
import { fakeApi, reply, signedInHandlers } from './support';

function createMenuItemFixture(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'item-86',
    categoryId: 'category-drinks',
    name: 'Fresh Palm Wine',
    description: 'Freshly tapped sweet palm wine',
    price: 3500,
    isAvailable: true,
    isFeatured: false,
    pairsWith: [],
    sortOrder: 1,
    translations: {},
    ...overrides,
  };
}

function renderAvailabilityToggleSwitch({
  item,
  disabled = false,
  role = 'MANAGER' as StaffRole,
  onToggleSuccess,
  onToggleError,
}: {
  item: MenuItem;
  disabled?: boolean;
  role?: StaffRole;
  onToggleSuccess?: (targetItem: MenuItem, nextIsAvailable: boolean) => void;
  onToggleError?: (caughtError: unknown) => void;
}) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({
    queries: { retry: false, refetchInterval: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  });

  return render(
    <AppProviders queryClient={queryClient}>
      <AvailabilityToggleSwitch
        item={item}
        disabled={disabled}
        onToggleSuccess={onToggleSuccess}
        onToggleError={onToggleError}
      />
    </AppProviders>,
  );
}

describe('AvailabilityToggleSwitch Component Suite', () => {
  beforeEach(() => {
    session.store({
      accessToken: 'access-token-test',
      refreshToken: 'refresh-token-test',
    });
  });

  it('renders green Available status when item.isAvailable is true', async () => {
    fakeApi({
      ...signedInHandlers('MANAGER'),
    });

    const mockItem = createMenuItemFixture({
      name: 'Chapman Cocktail',
      isAvailable: true,
    });

    renderAvailabilityToggleSwitch({ item: mockItem, role: 'MANAGER' });

    const toggleSwitchButton = screen.getByRole('switch', {
      name: /Toggle availability for Chapman Cocktail/i,
    });
    expect(toggleSwitchButton).toBeTruthy();
    expect(toggleSwitchButton.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('Available')).toBeTruthy();

    await waitFor(() => {
      expect((toggleSwitchButton as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it('renders red Unavailable (86\'d) status when item.isAvailable is false', async () => {
    fakeApi({
      ...signedInHandlers('MANAGER'),
    });

    const mockItem = createMenuItemFixture({
      name: 'Suya Skewer',
      isAvailable: false,
    });

    renderAvailabilityToggleSwitch({ item: mockItem, role: 'MANAGER' });

    const toggleSwitchButton = screen.getByRole('switch', {
      name: /Toggle availability for Suya Skewer/i,
    });
    expect(toggleSwitchButton).toBeTruthy();
    expect(toggleSwitchButton.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText("Unavailable (86'd)")).toBeTruthy();

    await waitFor(() => {
      expect((toggleSwitchButton as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it('toggles availability on click and calls PATCH /menu/items/:id/availability', async () => {
    let capturedPatchBody: unknown = null;
    const mockItem = createMenuItemFixture({
      id: 'item-86',
      name: 'Tiger Prawns',
      isAvailable: true,
    });

    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
      'PATCH /menu/items/item-86/availability': ({ body }) => {
        capturedPatchBody = body;
        return {
          ...mockItem,
          isAvailable: false,
        };
      },
    });

    const onToggleSuccessCallback = vi.fn();

    renderAvailabilityToggleSwitch({
      item: mockItem,
      role: 'RECEPTIONIST',
      onToggleSuccess: onToggleSuccessCallback,
    });

    const toggleSwitchButton = screen.getByRole('switch', {
      name: /Toggle availability for Tiger Prawns/i,
    });

    // Wait for auth to restore and button to be enabled
    await waitFor(() => {
      expect((toggleSwitchButton as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(toggleSwitchButton);

    await waitFor(() => {
      expect(capturedPatchBody).toEqual({ isAvailable: false });
      expect(onToggleSuccessCallback).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'item-86', isAvailable: false }),
        false,
      );
    });
  });

  it('disables the toggle switch for STAFF role users without MARK_ITEMS_UNAVAILABLE permission', async () => {
    fakeApi({
      ...signedInHandlers('STAFF'),
    });

    const mockItem = createMenuItemFixture({
      name: 'Jollof Rice',
      isAvailable: true,
    });

    renderAvailabilityToggleSwitch({ item: mockItem, role: 'STAFF' });

    const toggleSwitchButton = screen.getByRole('switch', {
      name: /Toggle availability for Jollof Rice/i,
    });

    // Wait for auth restore to finish with STAFF role
    await waitFor(() => {
      expect(
        toggleSwitchButton.getAttribute('title'),
      ).toContain('Only receptionists, managers, or admins can toggle item availability');
    });

    expect((toggleSwitchButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('enables the toggle switch for ADMIN role users', async () => {
    fakeApi({
      ...signedInHandlers('ADMIN'),
    });

    const mockItem = createMenuItemFixture({
      name: 'Egusi Soup',
      isAvailable: true,
    });

    renderAvailabilityToggleSwitch({ item: mockItem, role: 'ADMIN' });

    const toggleSwitchButton = screen.getByRole('switch', {
      name: /Toggle availability for Egusi Soup/i,
    });

    // Wait for session to restore as ADMIN and enable the switch
    await waitFor(() => {
      expect((toggleSwitchButton as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it('triggers error toast and onToggleError callback on API failure', async () => {
    const mockItem = createMenuItemFixture({
      id: 'item-99',
      name: 'Yam Pottage',
      isAvailable: true,
    });

    fakeApi({
      ...signedInHandlers('MANAGER'),
      'PATCH /menu/items/item-99/availability': () =>
        reply(400, { error: { message: 'Item cannot be modified' } }),
    });

    const onToggleErrorCallback = vi.fn();

    renderAvailabilityToggleSwitch({
      item: mockItem,
      role: 'MANAGER',
      onToggleError: onToggleErrorCallback,
    });

    const toggleSwitchButton = screen.getByRole('switch', {
      name: /Toggle availability for Yam Pottage/i,
    });

    // Wait for auth to restore and switch to be enabled
    await waitFor(() => {
      expect((toggleSwitchButton as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(toggleSwitchButton);

    await waitFor(() => {
      expect(onToggleErrorCallback).toHaveBeenCalled();
      expect(screen.getByText('Item cannot be modified')).toBeTruthy();
    });
  });
});
