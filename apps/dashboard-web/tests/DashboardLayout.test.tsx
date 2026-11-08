import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { session } from '../src/lib/session';
import {
  fakeApi,
  order,
  renderDashboard,
  signedInHandlers,
} from './support';

function resumeAuthenticatedSession() {
  session.store({ accessToken: 'expired', refreshToken: 'refresh-token-1' });
}

function setViewportWidth(viewportWidth: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: viewportWidth,
  });

  window.matchMedia = vi.fn().mockImplementation((mediaQueryString: string) => {
    const isTabletQuery =
      mediaQueryString.includes('768px') && mediaQueryString.includes('1024px');
    const matchesMediaQuery = isTabletQuery
      ? viewportWidth >= 768 && viewportWidth <= 1024
      : viewportWidth >= 1280;

    return {
      matches: matchesMediaQuery,
      media: mediaQueryString,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  });

  window.dispatchEvent(new Event('resize'));
}

describe('DashboardLayout desktop layout and navigation shell', () => {
  beforeEach(() => {
    setViewportWidth(1280);
    fakeApi({
      ...signedInHandlers('ADMIN'),
      'GET /orders': () => [order()],
      'GET /payments/outstanding': () => [],
    });
    resumeAuthenticatedSession();
  });

  it('renders semantic aside and main landmarks with accessibility skip link', async () => {
    renderDashboard('/orders');

    const asideLandmark = await screen.findByRole('complementary', {
      name: 'Sidebar navigation',
    });
    expect(asideLandmark).toBeTruthy();

    const mainNavigation = await screen.findByRole('navigation', {
      name: 'Main',
    });
    expect(mainNavigation).toBeTruthy();

    const skipToContentLink = screen.getByRole('link', {
      name: 'Skip to content',
    });
    expect(skipToContentLink).toBeTruthy();
    expect(skipToContentLink.getAttribute('href')).toBe('#main-content');
  });

  it('renders all required operations and administration navigation links with active highlight', async () => {
    renderDashboard('/orders');

    const mainNavigation = await screen.findByRole('navigation', {
      name: 'Main',
    });

    // 1. Live Orders
    const liveOrdersLink = within(mainNavigation).getByRole('link', {
      name: /Live orders/i,
    });
    expect(liveOrdersLink).toBeTruthy();
    expect(liveOrdersLink.getAttribute('aria-current')).toBe('page');

    // 2. Rooms & Stays
    const roomsLink = within(mainNavigation).getByRole('link', {
      name: /Rooms & stays/i,
    });
    expect(roomsLink).toBeTruthy();

    // 3. Menu
    const menuLink = within(mainNavigation).getByRole('link', {
      name: /Menu/i,
    });
    expect(menuLink).toBeTruthy();

    // 4. Payments
    const paymentsLink = within(mainNavigation).getByRole('link', {
      name: /Payments/i,
    });
    expect(paymentsLink).toBeTruthy();

    // 5. Staff
    const staffLink = within(mainNavigation).getByRole('link', {
      name: /Staff/i,
    });
    expect(staffLink).toBeTruthy();

    // 6. Activity Log
    const activityLogLink = within(mainNavigation).getByRole('link', {
      name: /Activity log/i,
    });
    expect(activityLogLink).toBeTruthy();

    // 7. Reports
    const reportsLink = within(mainNavigation).getByRole('link', {
      name: /Reports/i,
    });
    expect(reportsLink).toBeTruthy();

    // 8. Settings
    const settingsLink = within(mainNavigation).getByRole('link', {
      name: /Settings/i,
    });
    expect(settingsLink).toBeTruthy();
  });

  it('displays hotel name badge, staff profile summary, sound toggle and sign-out button in header', async () => {
    renderDashboard('/orders');

    const headerLandmark = await screen.findByRole('banner');

    // Hotel name badge in header
    const hotelNameBadge = within(headerLandmark).getByTestId('hotel-name-badge');
    expect(hotelNameBadge).toBeTruthy();
    expect(hotelNameBadge.textContent).toContain('Azure Bay Hotel');

    // Staff profile summary in header
    const staffProfileSummary = within(headerLandmark).getByTestId('staff-profile-summary');
    expect(staffProfileSummary).toBeTruthy();

    // Staff user role badge in header
    const staffUserBadge = within(headerLandmark).getByTestId('staff-user-badge');
    expect(staffUserBadge).toBeTruthy();
    expect(staffUserBadge.textContent).toContain('Admin');

    // Sound alert toggle button in header
    const soundToggleButton = within(headerLandmark).getByRole('button', {
      name: /Sound on/i,
    });
    expect(soundToggleButton).toBeTruthy();
    expect(soundToggleButton.getAttribute('aria-pressed')).toBe('true');

    // Sign out button in header
    const signOutButton = within(headerLandmark).getByRole('button', {
      name: 'Sign out',
    });
    expect(signOutButton).toBeTruthy();
  });

  it('allows staff to toggle sound notification on and off', async () => {
    renderDashboard('/orders');

    const headerLandmark = await screen.findByRole('banner');

    const soundToggleButton = within(headerLandmark).getByRole('button', {
      name: /Sound on/i,
    });
    expect(soundToggleButton.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(soundToggleButton);

    const mutedSoundButton = within(headerLandmark).getByRole('button', {
      name: /Sound off/i,
    });
    expect(mutedSoundButton.getAttribute('aria-pressed')).toBe('false');
  });

  it('supports interactive sidebar collapse toggle via header and sidebar buttons', async () => {
    renderDashboard('/orders');

    const sidebarLandmark = await screen.findByRole('complementary', {
      name: 'Sidebar navigation',
    });
    expect(sidebarLandmark.className).toContain('w-60');

    // Find collapse toggle button
    const collapseButton = screen.getAllByRole('button', {
      name: 'Collapse sidebar',
    })[0];
    expect(collapseButton.getAttribute('aria-expanded')).toBe('true');

    // Click collapse button
    fireEvent.click(collapseButton);

    // Sidebar should now be collapsed (icon bar width)
    expect(sidebarLandmark.className).toContain('w-16');

    // Navigation links should remain accessible with sr-only labels
    const mainNavigation = within(sidebarLandmark).getByRole('navigation', {
      name: 'Main',
    });
    expect(
      within(mainNavigation).getByRole('link', { name: /Live orders/i }),
    ).toBeTruthy();

    // Toggle button should now offer to expand sidebar
    const expandButton = screen.getAllByRole('button', {
      name: 'Expand sidebar',
    })[0];
    expect(expandButton.getAttribute('aria-expanded')).toBe('false');

    // Click to expand again
    fireEvent.click(expandButton);
    expect(sidebarLandmark.className).toContain('w-60');
  });

  it('collapses into an icon bar automatically on tablet viewport (768px width)', async () => {
    setViewportWidth(768);
    renderDashboard('/orders');

    const sidebarLandmark = await screen.findByRole('complementary', {
      name: 'Sidebar navigation',
    });
    // On tablet, initial state defaults to collapsed icon bar
    expect(sidebarLandmark.className).toContain('w-16');

    const mainNavigation = within(sidebarLandmark).getByRole('navigation', {
      name: 'Main',
    });
    const liveOrdersLink = within(mainNavigation).getByRole('link', {
      name: /Live orders/i,
    });
    expect(liveOrdersLink).toBeTruthy();
    expect(liveOrdersLink.getAttribute('title')).toBe('Live orders');
  });

  it('renders expanded full sidebar on desktop viewport (1280px width)', async () => {
    setViewportWidth(1280);
    renderDashboard('/orders');

    const sidebarLandmark = await screen.findByRole('complementary', {
      name: 'Sidebar navigation',
    });
    expect(sidebarLandmark.className).toContain('w-60');
    expect(within(sidebarLandmark).getByText('Azure Bay Hotel')).toBeTruthy();
  });

  it('routes to Reports placeholder page without console errors', async () => {
    renderDashboard('/reports');

    expect(
      await screen.findByRole('heading', { name: 'Reports & Analytics' }),
    ).toBeTruthy();
    expect(screen.getByText("Today's Orders")).toBeTruthy();
    expect(screen.getByText('Average Fulfillment Time')).toBeTruthy();
    expect(screen.getByText('Daily Operational Overview')).toBeTruthy();
  });
});
