import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ErrorRecoveryPage } from '../src/pages/ErrorRecoveryPage';
import { NotFoundPage } from '../src/pages/NotFoundPage';

describe('ErrorRecoveryPage Component Suite', () => {
  it('renders INACTIVE_STAY state matching prototype G08 with front desk link', () => {
    render(
      <MemoryRouter>
        <ErrorRecoveryPage initialReason="INACTIVE_STAY" />
      </MemoryRouter>
    );

    expect(screen.getByTestId('error-recovery-inactive-stay')).toBeDefined();
    expect(
      screen.getByRole('heading', {
        name: "Ordering isn't available for this room",
      })
    ).toBeDefined();
    expect(
      screen.getByText(
        "This room has no active stay. If you've just checked in, the front desk can activate it in seconds."
      )
    ).toBeDefined();

    const callFrontDeskLink = screen.getByTestId('call-front-desk-link');
    expect(callFrontDeskLink).toBeDefined();
    expect(callFrontDeskLink.getAttribute('href')).toBe('tel:0');
    expect(callFrontDeskLink.textContent).toContain('Call front desk');

    expect(screen.getByText('Return to Welcome Screen')).toBeDefined();
  });

  it('renders SESSION_EXPIRED state matching prototype G08 with QR rescan guidance and front desk link', () => {
    render(
      <MemoryRouter>
        <ErrorRecoveryPage initialReason="SESSION_EXPIRED" />
      </MemoryRouter>
    );

    expect(screen.getByTestId('error-recovery-session-expired')).toBeDefined();
    expect(
      screen.getByRole('heading', {
        name: "This code isn't valid",
      })
    ).toBeDefined();
    expect(
      screen.getByText(
        'The QR code may have been replaced. Please scan the code in your room, or call the front desk.'
      )
    ).toBeDefined();

    expect(screen.getByText('Rescan Room QR Code')).toBeDefined();
    expect(
      screen.getByText(
        'Please point your smartphone camera at the physical QR code on your room desk or bedside stand to renew your stay session.'
      )
    ).toBeDefined();

    const callFrontDeskLink = screen.getByTestId('call-front-desk-link');
    expect(callFrontDeskLink).toBeDefined();
    expect(callFrontDeskLink.getAttribute('href')).toBe('tel:0');
    expect(callFrontDeskLink.textContent).toContain('Call front desk');
  });

  it('renders NETWORK_OFFLINE state matching prototype G08 with retry button and front desk link', () => {
    const retryHandler = vi.fn();

    render(
      <MemoryRouter>
        <ErrorRecoveryPage
          initialReason="NETWORK_OFFLINE"
          onRetry={retryHandler}
        />
      </MemoryRouter>
    );

    expect(screen.getByTestId('error-recovery-network-offline')).toBeDefined();
    expect(
      screen.getByRole('heading', {
        name: "You're offline",
      })
    ).toBeDefined();
    expect(
      screen.getByText(
        "Your order is saved on this phone and will be sent once you're back online. It won't be duplicated."
      )
    ).toBeDefined();

    const tryAgainButton = screen.getByRole('button', { name: /Try again/i });
    expect(tryAgainButton).toBeDefined();
    fireEvent.click(tryAgainButton);
    expect(retryHandler).toHaveBeenCalledTimes(1);

    const callFrontDeskLink = screen.getByTestId('call-front-desk-link');
    expect(callFrontDeskLink).toBeDefined();
    expect(callFrontDeskLink.getAttribute('href')).toBe('tel:0');
  });

  it('renders NOT_FOUND state matching prototype G08 with menu navigation and front desk link', () => {
    render(
      <MemoryRouter>
        <ErrorRecoveryPage initialReason="NOT_FOUND" />
      </MemoryRouter>
    );

    expect(screen.getByTestId('error-recovery-not-found')).toBeDefined();
    expect(
      screen.getByRole('heading', {
        name: 'Page not found',
      })
    ).toBeDefined();
    expect(
      screen.getByText(
        "The page you're looking for doesn't exist or has moved. Return to the dining menu or call the front desk."
      )
    ).toBeDefined();

    expect(
      screen.getByRole('button', { name: /Browse Dining Menu/i })
    ).toBeDefined();

    const callFrontDeskLink = screen.getByTestId('call-front-desk-link');
    expect(callFrontDeskLink).toBeDefined();
    expect(callFrontDeskLink.getAttribute('href')).toBe('tel:0');
  });

  it('renders default recovery state when no reason is specified', () => {
    render(
      <MemoryRouter>
        <ErrorRecoveryPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('error-recovery-default')).toBeDefined();
    expect(screen.getByText('Session or Connection Issue')).toBeDefined();
    expect(screen.getByText('How to Reconnect')).toBeDefined();
    expect(
      screen.getByText(
        '1. Point your smartphone camera at the physical QR code on your room desk or bedside stand.'
      )
    ).toBeDefined();

    const callFrontDeskLink = screen.getByTestId('call-front-desk-link');
    expect(callFrontDeskLink).toBeDefined();
    expect(callFrontDeskLink.getAttribute('href')).toBe('tel:0');
  });

  it('parses reason parameter from URL search parameters correctly', () => {
    render(
      <MemoryRouter initialEntries={['/error?reason=inactive_stay']}>
        <Routes>
          <Route path="/error" element={<ErrorRecoveryPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('error-recovery-inactive-stay')).toBeDefined();
    expect(
      screen.getByRole('heading', {
        name: "Ordering isn't available for this room",
      })
    ).toBeDefined();
  });

  it('parses session_expired parameter from URL search parameters correctly', () => {
    render(
      <MemoryRouter initialEntries={['/error?reason=session_expired']}>
        <Routes>
          <Route path="/error" element={<ErrorRecoveryPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('error-recovery-session-expired')).toBeDefined();
    expect(
      screen.getByRole('heading', {
        name: "This code isn't valid",
      })
    ).toBeDefined();
  });

  it('renders NotFoundPage utilizing the G08 NOT_FOUND error state', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('error-recovery-not-found')).toBeDefined();
    expect(
      screen.getByRole('heading', {
        name: 'Page not found',
      })
    ).toBeDefined();
    expect(screen.getByTestId('call-front-desk-link')).toBeDefined();
  });
});
