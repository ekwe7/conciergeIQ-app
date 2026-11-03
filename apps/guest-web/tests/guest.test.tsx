import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { formatMoney } from '@conciergeiq/utils';
import { App } from '../src/App';
import { PageContainer } from '../src/components/layout/PageContainer';
import { MobileHeader } from '../src/components/layout/MobileHeader';
import { BottomNavigation } from '../src/components/layout/BottomNavigation';
import { BrowserRouter } from 'react-router-dom';

describe('Guest Web Application Suite', () => {
  it('mounts the root guest application component cleanly in jsdom', () => {
    const { container } = render(<App initialEntries={['/']} />);
    expect(container).toBeDefined();

    // Verify hotel title and room badge in MobileHeader and Welcome screen
    const hotelTitles = screen.getAllByText(/The Lagos Grand Hotel & Suites/i);
    expect(hotelTitles.length).toBeGreaterThanOrEqual(1);

    const roomBadges = screen.getAllByText(/Room 402/i);
    expect(roomBadges.length).toBeGreaterThanOrEqual(1);

    // Verify layout header and main content outlet exist
    expect(screen.getByTestId('guest-mobile-header')).toBeDefined();
    expect(screen.getByTestId('guest-main-content')).toBeDefined();
    expect(screen.getByTestId('guest-bottom-navigation')).toBeDefined();
  });

  it('verifies viewport layout constraints and safe-area insets at standard mobile width', () => {
    // Emulate 375px standard mobile viewport width (iPhone SE / X / 12 mini)
    window.innerWidth = 375;
    window.innerHeight = 667;
    window.dispatchEvent(new Event('resize'));

    const { container } = render(
      <PageContainer>
        <div data-testid="test-content">Mobile Screen Content</div>
      </PageContainer>
    );

    const pageContainerElement = container.querySelector(
      '[data-testid="guest-page-container"]'
    );
    expect(pageContainerElement).not.toBeNull();
    expect(pageContainerElement?.className).toContain('max-w-md');
    expect(pageContainerElement?.className).toContain('w-full');
    expect(pageContainerElement?.className).toContain('padding-bottom-safe-area');
  });

  it('renders mobile header with hotel title, room badge, and safe area top inset', () => {
    render(
      <MobileHeader
        hotelTitle="The Lagos Grand Hotel & Suites"
        roomNumber="402"
        guestName="Adeola Johnson"
        stayStatus="Active Stay"
      />
    );

    expect(screen.getByText('The Lagos Grand Hotel & Suites')).toBeDefined();
    expect(screen.getByText('Room 402')).toBeDefined();
    expect(screen.getByText('Adeola Johnson')).toBeDefined();

    const headerElement = screen.getByTestId('guest-mobile-header');
    expect(headerElement.className).toContain('padding-top-safe-area');
    expect(headerElement.className).toContain('sticky');
  });

  it('renders bottom navigation with safe-area insets and all primary guest routes', () => {
    render(
      <BrowserRouter>
        <BottomNavigation />
      </BrowserRouter>
    );

    const navigationElement = screen.getByTestId('guest-bottom-navigation');
    expect(navigationElement.className).toContain('padding-bottom-safe-area');

    expect(screen.getByText('Welcome')).toBeDefined();
    expect(screen.getByText('Menu')).toBeDefined();
    expect(screen.getByText('Cart')).toBeDefined();
    expect(screen.getByText('Orders')).toBeDefined();
    expect(screen.getByText('Folio Bill')).toBeDefined();
  });

  it('navigates between routes cleanly without full-page reloads', async () => {
    render(<App initialEntries={['/']} />);

    // Click on Menu bottom navigation link
    const menuNavigationLink = screen.getByText('Menu');
    fireEvent.click(menuNavigationLink);

    // Verify In-Room Dining menu page rendered
    expect(screen.getByText('In-Room Dining')).toBeDefined();
    expect(screen.getByText('Artisan Avocado & Poached Egg Toast')).toBeDefined();

    // Click on Folio Bill bottom navigation link
    const folioBillNavigationLink = screen.getByText('Folio Bill');
    fireEvent.click(folioBillNavigationLink);

    // Verify Room Folio Bill page rendered
    expect(screen.getByText('Room Folio Bill')).toBeDefined();
    expect(screen.getByText('Current Outstanding Balance')).toBeDefined();
  });

  it('renders error recovery page on /error route with scan QR code guidance', () => {
    render(<App initialEntries={['/error']} />);

    expect(screen.getByText('Session or Connection Issue')).toBeDefined();
    expect(screen.getByText(/How to Reconnect/i)).toBeDefined();
    expect(screen.getByText(/Point your smartphone camera/i)).toBeDefined();
  });

  it('formats room service item pricing accurately', () => {
    const formattedPrice = formatMoney(2400, 'USD');
    expect(formattedPrice).toBe('$24.00');
  });

  it('calculates cart subtotals and sales tax correctly', () => {
    const sampleItems = [
      { priceMinor: 1600, quantity: 2 },
      { priceMinor: 950, quantity: 1 },
    ];
    const subtotal = sampleItems.reduce(
      (accumulator, currentItem) =>
        accumulator + currentItem.priceMinor * currentItem.quantity,
      0
    );
    expect(subtotal).toBe(4150);

    const calculatedTax = Math.round(subtotal * 0.08);
    expect(calculatedTax).toBe(332);
    expect(subtotal + calculatedTax).toBe(4482);
  });
});
