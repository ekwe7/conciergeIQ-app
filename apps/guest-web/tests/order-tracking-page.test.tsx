import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Order, OrderStatus } from '@conciergeiq/contracts';
import { OrderTrackingPage } from '../src/pages/OrderTrackingPage';
import {
  saveGuestSession,
  clearGuestSession,
} from '../src/features/guest-session/session-store';

const WEB_SOCKET_CONNECTING_STATE: number = 0;
const WEB_SOCKET_OPEN_STATE: number = 1;
const WEB_SOCKET_CLOSING_STATE: number = 2;
const WEB_SOCKET_CLOSED_STATE: number = 3;

class MockWebSocketChannel {
  public static instances: MockWebSocketChannel[] = [];

  public static clearInstances(): void {
    MockWebSocketChannel.instances = [];
  }

  public static getLatestInstance(): MockWebSocketChannel {
    const latestSocket: MockWebSocketChannel | undefined =
      MockWebSocketChannel.instances[MockWebSocketChannel.instances.length - 1];
    if (!latestSocket) {
      throw new Error('No MockWebSocketChannel instances available');
    }
    return latestSocket;
  }

  public static CONNECTING: number = WEB_SOCKET_CONNECTING_STATE;
  public static OPEN: number = WEB_SOCKET_OPEN_STATE;
  public static CLOSING: number = WEB_SOCKET_CLOSING_STATE;
  public static CLOSED: number = WEB_SOCKET_CLOSED_STATE;

  public readyState: number = WEB_SOCKET_CONNECTING_STATE;
  public destinationUrl: string;
  public recordedSentMessages: string[] = [];
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  constructor(destinationUrl: string) {
    this.destinationUrl = destinationUrl;
    MockWebSocketChannel.instances.push(this);
    setTimeout(() => {
      this.simulateOpen();
    }, 0);
  }

  public simulateOpen(): void {
    this.readyState = WEB_SOCKET_OPEN_STATE;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  public simulateMessage(messagePayload: unknown): void {
    if (this.onmessage) {
      const serializedData: string =
        typeof messagePayload === 'string'
          ? messagePayload
          : JSON.stringify(messagePayload);
      this.onmessage(new MessageEvent('message', { data: serializedData }));
    }
  }

  public send(serializedMessage: string): void {
    this.recordedSentMessages.push(serializedMessage);
  }

  public close(
    closureCode: number = 1000,
    closureReason: string = 'Normal closure'
  ): void {
    this.readyState = WEB_SOCKET_CLOSED_STATE;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: closureCode, reason: closureReason }));
    }
  }
}

function createSampleOrder(
  orderStatus: OrderStatus = 'PENDING',
  orderIdentifier: string = 'ord_live_test_77',
  rejectionReasonText?: string
): Order {
  return {
    id: orderIdentifier,
    roomNumber: '402',
    stayId: 'stay_lagos_88',
    hotelId: 'htl_lagos_grand',
    status: orderStatus,
    items: [
      {
        itemId: 'item_suya_steak',
        name: 'Spiced Suya Beef Skewers',
        quantity: 2,
        unitPriceMinor: 3500,
        totalMinor: 7000,
        specialInstructions: 'Extra yaji pepper, well done',
      },
      {
        itemId: 'item_fresh_juice',
        name: 'Pineapple Ginger Juice',
        quantity: 1,
        unitPriceMinor: 1500,
        totalMinor: 1500,
      },
    ],
    subtotalMinor: 8500,
    taxMinor: 680,
    totalMinor: 9180,
    createdAt: '2026-11-06T19:38:00.000Z',
    updatedAt: '2026-11-06T19:42:00.000Z',
    ...(rejectionReasonText ? { rejectionReason: rejectionReasonText } : {}),
  };
}

describe('OrderTrackingPage & Multi-Step Stepper Suite', () => {
  let queryClientInstance: QueryClient;
  const sampleSessionToken: string = 'session_token_live_tracking_999';
  const sampleStayIdentifier: string = 'stay_lagos_88';

  beforeEach(() => {
    queryClientInstance = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    MockWebSocketChannel.clearInstances();
    vi.stubGlobal('WebSocket', MockWebSocketChannel);

    saveGuestSession({
      sessionToken: sampleSessionToken,
      sessionId: sampleStayIdentifier,
      hotelId: 'htl_lagos_grand',
      hotelName: 'Lagos Grand Hotel',
      roomId: '402',
      roomNumber: '402',
      stayId: sampleStayIdentifier,
      guestName: 'Chidi Okafor',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    });
  });

  afterEach(() => {
    clearGuestSession();
    vi.unstubAllGlobals();
    queryClientInstance.clear();
  });

  function renderOrderTrackingScreen(
    initialOrderData?: Order,
    orderIdParameter: string = 'ord_live_test_77'
  ) {
    return render(
      <QueryClientProvider client={queryClientInstance}>
        <MemoryRouter initialEntries={[`/orders/${orderIdParameter}`]}>
          <Routes>
            <Route
              path="/orders/:orderId"
              element={<OrderTrackingPage order={initialOrderData} />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  describe('Initial State Rendering (PENDING, IN_PROGRESS, DELIVERED, CANCELLED)', () => {
    it('renders initial order details and active stepper step in PENDING state', () => {
      const pendingOrder = createSampleOrder('PENDING');

      renderOrderTrackingScreen(pendingOrder);

      // Order Reference and Room Badge
      expect(screen.getByText(`Order #${pendingOrder.id}`)).toBeInTheDocument();
      expect(screen.getByText(`Room ${pendingOrder.roomNumber}`)).toBeInTheDocument();

      // Hero Title and Badge
      expect(screen.getByRole('heading', { level: 2, name: /Order received/i })).toBeInTheDocument();
      expect(screen.getByText('ORDER RECEIVED')).toBeInTheDocument();

      // Stepper Stage 1 active
      expect(screen.getByRole('heading', { level: 4, name: /Order received/i })).toBeInTheDocument();
      expect(screen.getByText('In the kitchen')).toBeInTheDocument();
      expect(screen.getByText('Delivered')).toBeInTheDocument();

      // Receipt Items and Totals
      expect(screen.getByText('Spiced Suya Beef Skewers')).toBeInTheDocument();
      expect(screen.getByText('Pineapple Ginger Juice')).toBeInTheDocument();
      expect(screen.getByText('“Extra yaji pepper, well done”')).toBeInTheDocument();
    });

    it('renders IN_PROGRESS state indicating kitchen preparation and completed stage 1', () => {
      const inProgressOrder = createSampleOrder('IN_PROGRESS');

      renderOrderTrackingScreen(inProgressOrder);

      // Hero Title and Badge
      expect(screen.getByRole('heading', { level: 2, name: /Being prepared/i })).toBeInTheDocument();
      expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();

      // Subtitle
      expect(screen.getByText(/Accepted by kitchen/i)).toBeInTheDocument();
    });

    it('renders DELIVERED state indicating final arrival at room door', () => {
      const deliveredOrder = createSampleOrder('DELIVERED');

      renderOrderTrackingScreen(deliveredOrder);

      expect(screen.getByRole('heading', { level: 2, name: /Delivered to room/i })).toBeInTheDocument();
      expect(screen.getByText('DELIVERED')).toBeInTheDocument();
      expect(screen.getByText(/Arrived at Room 402/i)).toBeInTheDocument();
    });

    it('renders CANCELLED state with alert banner and server-provided rejection reason', () => {
      const cancellationReasonMessage =
        'Kitchen closed early due to a power outage. Please contact front desk.';
      const cancelledOrder = createSampleOrder(
        'CANCELLED',
        'ord_live_test_77',
        cancellationReasonMessage
      );

      renderOrderTrackingScreen(cancelledOrder);

      expect(screen.getByRole('heading', { level: 2, name: /Order cancelled/i })).toBeInTheDocument();
      expect(screen.getByText('CANCELLED')).toBeInTheDocument();

      // Cancellation alert banner with server reason
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(cancellationReasonMessage)).toBeInTheDocument();

      // Stepper is hidden when cancelled
      expect(screen.queryByLabelText('Order fulfillment progress')).not.toBeInTheDocument();
    });
  });

  describe('Real-Time Dynamic Transitions via WebSocket Push', () => {
    it('advances stepper dynamically from PENDING to IN_PROGRESS upon receiving ORDER_STATUS_UPDATED', async () => {
      const initialPendingOrder = createSampleOrder('PENDING');

      renderOrderTrackingScreen(initialPendingOrder);

      expect(screen.getByRole('heading', { level: 2, name: /Order received/i })).toBeInTheDocument();
      expect(screen.getByText('ORDER RECEIVED')).toBeInTheDocument();

      // Retrieve established WebSocket connection
      const webSocketChannelInstance = MockWebSocketChannel.getLatestInstance();

      // Simulate incoming server WebSocket frame updating order status to IN_PROGRESS
      act(() => {
        webSocketChannelInstance.simulateMessage({
          type: 'ORDER_STATUS_UPDATED',
          eventId: 'evt_seq_1001',
          orderId: initialPendingOrder.id,
          newStatus: 'IN_PROGRESS',
          updatedAt: '2026-11-06T19:42:00.000Z',
          stayId: sampleStayIdentifier,
        });
      });

      // Stepper and Hero Card advance immediately without page reload
      expect(
        await screen.findByRole('heading', { level: 2, name: /Being prepared/i })
      ).toBeInTheDocument();
      expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();

      // Simulate subsequent WebSocket frame updating status to DELIVERED
      act(() => {
        webSocketChannelInstance.simulateMessage({
          type: 'ORDER_STATUS_UPDATED',
          eventId: 'evt_seq_1002',
          orderId: initialPendingOrder.id,
          newStatus: 'DELIVERED',
          updatedAt: '2026-11-06T19:55:00.000Z',
          stayId: sampleStayIdentifier,
        });
      });

      expect(
        await screen.findByRole('heading', { level: 2, name: /Delivered to room/i })
      ).toBeInTheDocument();
      expect(screen.getByText('DELIVERED')).toBeInTheDocument();
    });

    it('announces status changes politely to screen readers via aria-live', async () => {
      const initialPendingOrder = createSampleOrder('PENDING');

      renderOrderTrackingScreen(initialPendingOrder);

      const liveRegionElement = screen.getByRole('status');
      expect(liveRegionElement).toBeInTheDocument();
      expect(liveRegionElement).toHaveTextContent(/Current status is Order received/i);

      const webSocketChannelInstance = MockWebSocketChannel.getLatestInstance();

      act(() => {
        webSocketChannelInstance.simulateMessage({
          type: 'ORDER_STATUS_UPDATED',
          orderId: initialPendingOrder.id,
          newStatus: 'IN_PROGRESS',
          stayId: sampleStayIdentifier,
        });
      });

      expect(
        await screen.findByText(/Order is now in the kitchen being prepared/i)
      ).toBeInTheDocument();
    });
  });

  describe('Receipt & User Action Interactions', () => {
    it('allows toggling order receipt expansion', () => {
      const sampleOrder = createSampleOrder('PENDING');

      renderOrderTrackingScreen(sampleOrder);

      const receiptToggleTrigger = screen.getByRole('button', {
        name: /Order Receipt/i,
      });
      expect(receiptToggleTrigger).toBeInTheDocument();

      // Initially expanded
      expect(screen.getByText('Spiced Suya Beef Skewers')).toBeInTheDocument();

      // Collapse receipt
      fireEvent.click(receiptToggleTrigger);
      expect(screen.queryByText('“Extra yaji pepper, well done”')).not.toBeInTheDocument();

      // Expand receipt
      fireEvent.click(receiptToggleTrigger);
      expect(screen.getByText('“Extra yaji pepper, well done”')).toBeInTheDocument();
    });

    it('invokes onBackToMenu callback when clicking back arrow button', () => {
      let backNavigationCallbackTriggered: boolean = false;
      const sampleOrder = createSampleOrder('PENDING');

      render(
        <QueryClientProvider client={queryClientInstance}>
          <MemoryRouter initialEntries={[`/orders/${sampleOrder.id}`]}>
            <OrderTrackingPage
              order={sampleOrder}
              onBackToMenu={() => {
                backNavigationCallbackTriggered = true;
              }}
            />
          </MemoryRouter>
        </QueryClientProvider>
      );

      const backArrowButton = screen.getByRole('button', {
        name: /Back to In-Room Menu/i,
      });
      fireEvent.click(backArrowButton);

      expect(backNavigationCallbackTriggered).toBe(true);
    });
  });
});
