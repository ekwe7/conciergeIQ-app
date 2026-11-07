import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import type { UseGuestWebSocketOptions } from '../src/features/guest-session/hooks/useGuestWebSocket';
import type { OrderStatusUpdatedPayload } from '../src/lib/websocket-client';
import { clearGuestSession } from '../src/features/guest-session/session-store';
import { ToastProvider } from '../src/components/feedback/ToastContext';
import { ToastContainer } from '../src/components/feedback/ToastContainer';
import { BackgroundOrderNotificationListener } from '../src/components/feedback/BackgroundOrderNotificationListener';
import { ACTIVE_STAY_IDENTIFIER, OTHER_STAY_IDENTIFIER, createTestQueryClient, saveActiveGuestSession } from './fixtures/stay-fixtures';

const capturedWebSocketOptions: { latest: UseGuestWebSocketOptions | null } = { latest: null };

vi.mock('../src/features/guest-session/hooks/useGuestWebSocket', () => ({
  useGuestWebSocket: (hookOptions: UseGuestWebSocketOptions) => {
    capturedWebSocketOptions.latest = hookOptions;
    return { isConnected: hookOptions.enabled !== false };
  },
}));

let navigateFromTest: ((targetPath: string) => void) | null = null;
const NavigationHandle: React.FC = () => {
  navigateFromTest = useNavigate();
  return null;
};

function renderListenerAt(initialPath: string) {
  const queryClient = createTestQueryClient();
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <NavigationHandle />
          <ToastContainer />
          <BackgroundOrderNotificationListener />
          <Routes>
            <Route path="/menu" element={<p>Menu screen</p>} />
            <Route path="/orders/:orderId" element={<p>Tracking screen</p>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
  return { invalidateSpy };
}

function emitOrderStatusUpdate(orderUpdatePayload: OrderStatusUpdatedPayload): void {
  act(() => {
    capturedWebSocketOptions.latest?.onOrderStatusUpdated?.(orderUpdatePayload);
  });
}

describe('BackgroundOrderNotificationListener', () => {
  beforeEach(() => {
    capturedWebSocketOptions.latest = null;
    saveActiveGuestSession();
  });

  afterEach(() => {
    clearGuestSession();
  });

  it('shows a toast for order status updates while browsing other screens', () => {
    renderListenerAt('/menu');
    expect(capturedWebSocketOptions.latest?.enabled).toBe(true);

    emitOrderStatusUpdate({ orderId: 'ord_123', newStatus: 'DELIVERED', stayId: ACTIVE_STAY_IDENTIFIER });

    expect(screen.getByText('Order delivered')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Track order/i })).toBeInTheDocument();
  });

  it('refreshes the folio bill when an order status changes', () => {
    const { invalidateSpy } = renderListenerAt('/menu');
    emitOrderStatusUpdate({ orderId: 'ord_123', newStatus: 'DELIVERED' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['guest', 'stay-bill'] });
  });

  it('navigates to the tracking screen from the toast action', () => {
    renderListenerAt('/menu');
    emitOrderStatusUpdate({ orderId: 'ord_123', newStatus: 'IN_PROGRESS' });

    act(() => {
      screen.getByRole('button', { name: /Track order/i }).click();
    });
    expect(screen.getByText('Tracking screen')).toBeInTheDocument();
  });

  it('disconnects its background socket while the guest is on the tracking screen', () => {
    renderListenerAt('/orders/ord_123');
    expect(capturedWebSocketOptions.latest?.enabled).toBe(false);

    act(() => {
      navigateFromTest?.('/menu');
    });
    expect(capturedWebSocketOptions.latest?.enabled).toBe(true);
  });

  it('ignores duplicate replayed events', () => {
    renderListenerAt('/menu');
    emitOrderStatusUpdate({ orderId: 'ord_123', newStatus: 'DELIVERED', eventId: 'evt_1' });
    emitOrderStatusUpdate({ orderId: 'ord_123', newStatus: 'DELIVERED', eventId: 'evt_1' });
    expect(screen.getAllByText('Order delivered')).toHaveLength(1);
  });

  it('ignores events for another stay and unknown statuses', () => {
    renderListenerAt('/menu');
    emitOrderStatusUpdate({ orderId: 'ord_foreign', newStatus: 'DELIVERED', stayId: OTHER_STAY_IDENTIFIER });
    emitOrderStatusUpdate({ orderId: 'ord_123', newStatus: 'TELEPORTED' });
    expect(screen.getByRole('region', { name: 'Notifications' })).toBeEmptyDOMElement();
  });
});
