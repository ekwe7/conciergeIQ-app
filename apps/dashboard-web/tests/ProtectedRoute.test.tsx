import { StaffRole } from '@conciergeiq/contracts';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { session } from '../src/lib/session';
import {
  HOTEL,
  fakeApi,
  order,
  renderDashboard,
  signedInHandlers,
} from './support';

function seedResumableSession() {
  session.store({ accessToken: 'expired-access-token', refreshToken: 'valid-refresh-token' });
}

describe('ProtectedRoute authentication and permission guards', () => {
  it('redirects unauthenticated users attempting to visit a protected route to /login', async () => {
    fakeApi({});
    session.clear();

    const { router } = renderDashboard('/dashboard/rooms');

    expect(await screen.findByRole('heading', { name: 'Staff sign in' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.state).toEqual({ from: '/dashboard/rooms' });
  });

  it('renders a session restoration indicator while exchanging a stored refresh token', async () => {
    let resolveRefreshResponse!: (response: Response) => void;
    const pendingRefreshPromise = new Promise<Response>((resolve) => {
      resolveRefreshResponse = resolve;
    });

    const baseApi = fakeApi({
      'GET /hotel': () => HOTEL,
      'GET /orders': () => [],
      'GET /payments/outstanding': () => [],
    });

    const originalFetchMock = baseApi.fetchMock;
    baseApi.fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = String(input);
      if (requestUrl.endsWith('/auth/refresh')) {
        return pendingRefreshPromise;
      }
      return originalFetchMock(input, init);
    });

    seedResumableSession();
    renderDashboard('/dashboard/orders');

    const restoringStatus = await screen.findByRole('status');
    expect(restoringStatus.textContent).toContain('Restoring your session');

    resolveRefreshResponse(
      new Response(
        JSON.stringify({
          accessToken: 'access-restored',
          refreshToken: 'refresh-restored',
          expiresIn: 900,
          user: {
            id: 'user-staff',
            hotelId: HOTEL.id,
            email: 'kitchen@azurebay.test',
            fullName: 'Chidi Okeke',
            role: StaffRole.STAFF,
            isActive: true,
            lastSignedInAt: null,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    expect(await screen.findByRole('heading', { name: 'Live orders' })).toBeTruthy();
  });

  it('redirects a signed-in STAFF user from /dashboard/rooms to /dashboard/orders with a 403 banner', async () => {
    fakeApi({
      ...signedInHandlers(StaffRole.STAFF),
      'GET /orders': () => [order()],
    });
    seedResumableSession();

    const { router } = renderDashboard('/dashboard/rooms');

    expect(await screen.findByRole('heading', { name: 'Live orders' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/dashboard/orders');

    const accessDeniedAlert = await screen.findByRole('alert');
    expect(accessDeniedAlert.textContent).toContain('403 Forbidden');
    expect(accessDeniedAlert.textContent).toContain('You do not have access to this page');
    expect(accessDeniedAlert.textContent).toContain('/dashboard/rooms');
  });

  it('redirects a signed-in RECEPTIONIST user from /dashboard/settings to /dashboard/orders with a 403 banner', async () => {
    fakeApi({
      ...signedInHandlers(StaffRole.RECEPTIONIST),
      'GET /orders': () => [],
    });
    seedResumableSession();

    const { router } = renderDashboard('/dashboard/settings');

    expect(await screen.findByRole('heading', { name: 'Live orders' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/dashboard/orders');

    const accessDeniedBanner = await screen.findByTestId('access-denied-banner');
    expect(accessDeniedBanner.textContent).toContain('403 Forbidden');
    expect(accessDeniedBanner.textContent).toContain('You do not have access to this page');

    // Dismissing the 403 alert hides the banner while keeping the user on Live Orders
    fireEvent.click(within(accessDeniedBanner).getByRole('button', { name: 'Dismiss access alert' }));
    expect(screen.queryByTestId('access-denied-banner')).toBeNull();
  });

  it('redirects a signed-in MANAGER user from /dashboard/qr-codes (ADMIN-only) to /dashboard/orders with a 403 banner', async () => {
    fakeApi({
      ...signedInHandlers(StaffRole.MANAGER),
      'GET /orders': () => [],
    });
    seedResumableSession();

    const { router } = renderDashboard('/dashboard/qr-codes');

    expect(await screen.findByRole('heading', { name: 'Live orders' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/dashboard/orders');
    expect(await screen.findByTestId('access-denied-banner')).toBeTruthy();
  });

  it('allows an authorized role to view a protected route without showing the 403 banner', async () => {
    fakeApi({
      ...signedInHandlers(StaffRole.RECEPTIONIST),
      'GET /orders': () => [],
      'GET /rooms': () => [],
      'GET /stays/active': () => [],
    });
    seedResumableSession();

    const { router } = renderDashboard('/dashboard/rooms');

    expect(await screen.findByRole('heading', { name: 'Rooms & stays' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/dashboard/rooms');
    expect(screen.queryByTestId('access-denied-banner')).toBeNull();
  });
});

describe('Sidebar role-filtered navigation links', () => {
  it('shows ONLY "Live orders" in the sidebar for signed-in STAFF users', async () => {
    fakeApi({
      ...signedInHandlers(StaffRole.STAFF),
      'GET /orders': () => [],
    });
    seedResumableSession();

    renderDashboard('/dashboard/orders');

    const mainNavigation = await screen.findByRole('navigation', { name: 'Main' });
    const visibleLinks = within(mainNavigation).getAllByRole('link');

    expect(visibleLinks).toHaveLength(1);
    expect(within(mainNavigation).getByRole('link', { name: /Live orders/i })).toBeTruthy();
    expect(within(mainNavigation).queryByRole('link', { name: /Rooms & stays/i })).toBeNull();
    expect(within(mainNavigation).queryByRole('link', { name: /Payments/i })).toBeNull();
    expect(within(mainNavigation).queryByRole('link', { name: /Menu/i })).toBeNull();
    expect(within(mainNavigation).queryByRole('link', { name: /Staff/i })).toBeNull();
    expect(within(mainNavigation).queryByRole('link', { name: /Activity log/i })).toBeNull();
    expect(within(mainNavigation).queryByRole('link', { name: /Settings/i })).toBeNull();
  });

  it('shows Live Orders, Rooms & Stays, and Payments for RECEPTIONIST users', async () => {
    fakeApi({
      ...signedInHandlers(StaffRole.RECEPTIONIST),
      'GET /orders': () => [],
    });
    seedResumableSession();

    renderDashboard('/dashboard/orders');

    const mainNavigation = await screen.findByRole('navigation', { name: 'Main' });
    const visibleLinks = within(mainNavigation).getAllByRole('link');

    expect(visibleLinks).toHaveLength(3);
    expect(within(mainNavigation).getByRole('link', { name: /Live orders/i })).toBeTruthy();
    expect(within(mainNavigation).getByRole('link', { name: /Rooms & stays/i })).toBeTruthy();
    expect(within(mainNavigation).getByRole('link', { name: /Payments/i })).toBeTruthy();

    expect(within(mainNavigation).queryByRole('link', { name: /Menu management/i })).toBeNull();
    expect(within(mainNavigation).queryByRole('link', { name: /Staff/i })).toBeNull();
    expect(within(mainNavigation).queryByRole('link', { name: /Activity log/i })).toBeNull();
    expect(within(mainNavigation).queryByRole('link', { name: /Hotel settings/i })).toBeNull();
  });

  it('shows Menu Management, Staff, and Activity Log for MANAGER users while hiding ADMIN-only links', async () => {
    fakeApi({
      ...signedInHandlers(StaffRole.MANAGER),
      'GET /orders': () => [],
    });
    seedResumableSession();

    renderDashboard('/dashboard/orders');

    const mainNavigation = await screen.findByRole('navigation', { name: 'Main' });

    expect(within(mainNavigation).getByRole('link', { name: /Live orders/i })).toBeTruthy();
    expect(within(mainNavigation).getByRole('link', { name: /Rooms & stays/i })).toBeTruthy();
    expect(within(mainNavigation).getByRole('link', { name: /Menu management/i })).toBeTruthy();
    expect(within(mainNavigation).getByRole('link', { name: /Payments/i })).toBeTruthy();
    expect(within(mainNavigation).getByRole('link', { name: /Staff/i })).toBeTruthy();
    expect(within(mainNavigation).getByRole('link', { name: /Activity log/i })).toBeTruthy();

    expect(within(mainNavigation).queryByRole('link', { name: /Rooms & QR codes/i })).toBeNull();
    expect(within(mainNavigation).queryByRole('link', { name: /Hotel settings/i })).toBeNull();
  });

  it('shows all navigation links including Rooms & QR codes and Hotel Settings for ADMIN users', async () => {
    fakeApi({
      ...signedInHandlers(StaffRole.ADMIN),
      'GET /orders': () => [],
    });
    seedResumableSession();

    renderDashboard('/dashboard/orders');

    const mainNavigation = await screen.findByRole('navigation', { name: 'Main' });

    expect(within(mainNavigation).getByRole('link', { name: /Live orders/i })).toBeTruthy();
    expect(within(mainNavigation).getByRole('link', { name: /Rooms & stays/i })).toBeTruthy();
    expect(within(mainNavigation).getByRole('link', { name: /Menu management/i })).toBeTruthy();
    expect(within(mainNavigation).getByRole('link', { name: /Payments/i })).toBeTruthy();
    expect(within(mainNavigation).getByRole('link', { name: /Rooms & QR codes/i })).toBeTruthy();
    expect(within(mainNavigation).getByRole('link', { name: /Staff/i })).toBeTruthy();
    expect(within(mainNavigation).getByRole('link', { name: /Activity log/i })).toBeTruthy();
    expect(within(mainNavigation).getByRole('link', { name: /Reports/i })).toBeTruthy();
    expect(within(mainNavigation).getByRole('link', { name: /Escalations/i })).toBeTruthy();
    expect(within(mainNavigation).getByRole('link', { name: /Concierge answers/i })).toBeTruthy();
    expect(within(mainNavigation).getByRole('link', { name: /Hotel settings/i })).toBeTruthy();
  });
});
