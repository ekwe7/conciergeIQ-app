import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../src/components/feedback/ErrorBoundary';

const FaultyComponent: React.FC<{ shouldThrowError?: boolean }> = ({
  shouldThrowError = true,
}) => {
  if (shouldThrowError) {
    throw new Error('Test rendering detonation occurred');
  }
  return <div data-testid="healthy-component">All systems operational</div>;
};

describe('ErrorBoundary Component Suite', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress expected React console.error for thrown exceptions in test boundary
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('renders children without interference when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <FaultyComponent shouldThrowError={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('healthy-component')).toBeDefined();
    expect(screen.queryByTestId('error-boundary-fallback')).toBeNull();
  });

  it('catches render errors and renders the standard fallback view', () => {
    render(
      <ErrorBoundary>
        <FaultyComponent shouldThrowError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeDefined();
    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(
      screen.getByText(
        'An unexpected error occurred while loading this view. You can reload the application to try again.'
      )
    ).toBeDefined();
    expect(screen.getByTestId('reload-application-button')).toBeDefined();
  });

  it('triggers the onErrorCaught callback when an unhandled exception occurs', () => {
    const errorCaughtCallback = vi.fn();

    render(
      <ErrorBoundary onErrorCaught={errorCaughtCallback}>
        <FaultyComponent shouldThrowError={true} />
      </ErrorBoundary>
    );

    expect(errorCaughtCallback).toHaveBeenCalledTimes(1);
    expect(errorCaughtCallback).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test rendering detonation occurred' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('renders a custom fallback when fallbackRender is provided', () => {
    render(
      <ErrorBoundary
        fallbackRender={(caughtError, resetBoundary) => (
          <div data-testid="custom-fallback">
            <span>Custom: {caughtError.message}</span>
            <button type="button" onClick={resetBoundary}>
              Reset Boundary
            </button>
          </div>
        )}
      >
        <FaultyComponent shouldThrowError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeDefined();
    expect(
      screen.getByText('Custom: Test rendering detonation occurred')
    ).toBeDefined();
  });

  it('triggers window.location.reload when the reload application button is clicked', () => {
    const reloadMock = vi.fn();
    const originalLocation = window.location;

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        reload: reloadMock,
      },
    });

    try {
      render(
        <ErrorBoundary>
          <FaultyComponent shouldThrowError={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByTestId('reload-application-button');
      fireEvent.click(reloadButton);

      expect(reloadMock).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
    }
  });
});
