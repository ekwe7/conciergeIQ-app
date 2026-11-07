import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineBanner } from '../src/components/feedback/OfflineBanner';

describe('OfflineBanner Component Suite', () => {
  const originalNavigatorOnLineDescriptor = Object.getOwnPropertyDescriptor(
    navigator,
    'onLine'
  );

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalNavigatorOnLineDescriptor) {
      Object.defineProperty(navigator, 'onLine', originalNavigatorOnLineDescriptor);
    }
  });

  it('renders nothing when the device is online', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('offline-banner')).toBeNull();
  });

  it('renders the banner with status and live region when the device is offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    render(<OfflineBanner />);

    const bannerElement = screen.getByTestId('offline-banner');
    expect(bannerElement).toBeDefined();
    expect(bannerElement.getAttribute('role')).toBe('status');
    expect(bannerElement.getAttribute('aria-live')).toBe('polite');
    expect(
      screen.getByText('You are currently offline. Check your internet connection.')
    ).toBeDefined();
  });

  it('honors the isOfflineOverride boolean property regardless of navigator status', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    // Forced offline override while navigator says online
    const { rerender } = render(<OfflineBanner isOfflineOverride={true} />);
    expect(screen.getByTestId('offline-banner')).toBeDefined();

    // Forced online override while navigator says offline
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    rerender(<OfflineBanner isOfflineOverride={false} />);
    expect(screen.queryByTestId('offline-banner')).toBeNull();
  });
});
