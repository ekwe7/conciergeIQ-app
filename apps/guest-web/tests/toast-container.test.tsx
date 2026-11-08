import React from 'react';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast, ShowToastOptions } from '../src/components/feedback/ToastContext';
import { ToastContainer } from '../src/components/feedback/ToastContainer';
import { TOAST_EXIT_ANIMATION_MILLISECONDS } from '../src/components/feedback/ToastItem';

beforeAll(() => {
  // jsdom lacks PointerEvent; a MouseEvent subclass preserves clientX for swipe gestures.
  if (typeof window.PointerEvent === 'undefined') {
    class PointerEventPolyfill extends MouseEvent {
      pointerId: number;
      constructor(eventType: string, eventInit: PointerEventInit = {}) {
        super(eventType, eventInit);
        this.pointerId = eventInit.pointerId ?? 1;
      }
    }
    Object.defineProperty(window, 'PointerEvent', { value: PointerEventPolyfill, writable: true });
  }
});

afterEach(() => {
  vi.useRealTimers();
});

let latestShowToast: ((toastOptions: ShowToastOptions) => string) | null = null;

const ToastTrigger: React.FC = () => {
  latestShowToast = useToast().showToast;
  return null;
};

function renderToastSystem() {
  return render(
    <ToastProvider>
      <ToastTrigger />
      <ToastContainer />
    </ToastProvider>
  );
}

function showSampleToast(overrides: Partial<ShowToastOptions> = {}): void {
  act(() => {
    latestShowToast?.({ title: 'Order delivered', message: 'Enjoy your meal!', variant: 'success', ...overrides });
  });
}

describe('ToastContainer and useToast', () => {
  it('keeps a polite live region mounted even when there are no toasts', () => {
    renderToastSystem();
    const notificationRegion = screen.getByRole('region', { name: 'Notifications' });
    expect(notificationRegion).toHaveAttribute('aria-live', 'polite');
    expect(notificationRegion).toBeEmptyDOMElement();
  });

  it('renders a toast and auto-dismisses it after 4 seconds', () => {
    vi.useFakeTimers();
    renderToastSystem();

    showSampleToast();
    expect(screen.getByText('Order delivered')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3900);
    });
    expect(screen.getByText('Order delivered')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(100 + TOAST_EXIT_ANIMATION_MILLISECONDS);
    });
    expect(screen.queryByText('Order delivered')).not.toBeInTheDocument();
  });

  it('pauses the countdown while hovered', () => {
    vi.useFakeTimers();
    renderToastSystem();
    showSampleToast();

    const toastElement = screen.getByText('Order delivered').closest('[data-testid^="toast-item-"]') as HTMLElement;
    fireEvent.mouseEnter(toastElement);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByText('Order delivered')).toBeInTheDocument();

    fireEvent.mouseLeave(toastElement);
    act(() => {
      vi.advanceTimersByTime(4000 + TOAST_EXIT_ANIMATION_MILLISECONDS);
    });
    expect(screen.queryByText('Order delivered')).not.toBeInTheDocument();
  });

  it('dismisses via the close button', () => {
    vi.useFakeTimers();
    renderToastSystem();
    showSampleToast();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    act(() => {
      vi.advanceTimersByTime(TOAST_EXIT_ANIMATION_MILLISECONDS);
    });
    expect(screen.queryByText('Order delivered')).not.toBeInTheDocument();
  });

  it('dismisses when swiped horizontally past the threshold, but not on a short drag', () => {
    vi.useFakeTimers();
    renderToastSystem();
    showSampleToast();

    const toastElement = screen.getByText('Order delivered').closest('[data-testid^="toast-item-"]') as HTMLElement;

    fireEvent.pointerDown(toastElement, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(toastElement, { clientX: 130, pointerId: 1 });
    fireEvent.pointerUp(toastElement, { clientX: 130, pointerId: 1 });
    act(() => {
      vi.advanceTimersByTime(TOAST_EXIT_ANIMATION_MILLISECONDS);
    });
    expect(screen.getByText('Order delivered')).toBeInTheDocument();

    fireEvent.pointerDown(toastElement, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(toastElement, { clientX: 220, pointerId: 1 });
    fireEvent.pointerUp(toastElement, { clientX: 220, pointerId: 1 });
    act(() => {
      vi.advanceTimersByTime(TOAST_EXIT_ANIMATION_MILLISECONDS);
    });
    expect(screen.queryByText('Order delivered')).not.toBeInTheDocument();
  });

  it('runs the toast action and then dismisses', () => {
    vi.useFakeTimers();
    const handleActionClick = vi.fn();
    renderToastSystem();
    showSampleToast({ action: { label: 'Track order', onClick: handleActionClick } });

    fireEvent.click(screen.getByRole('button', { name: /Track order/i }));
    expect(handleActionClick).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(TOAST_EXIT_ANIMATION_MILLISECONDS);
    });
    expect(screen.queryByText('Order delivered')).not.toBeInTheDocument();
  });

  it('caps the stack at three concurrent toasts, dropping the oldest', () => {
    renderToastSystem();
    ['First', 'Second', 'Third', 'Fourth'].forEach((toastTitle) => showSampleToast({ title: toastTitle }));

    expect(screen.queryByText('First')).not.toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Fourth')).toBeInTheDocument();
  });
});
