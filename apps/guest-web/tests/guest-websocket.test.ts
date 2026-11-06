import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import {
  GuestWebSocketClient,
  SESSION_EXPIRED_CLOSE_CODE,
  OrderStatusUpdatedPayload,
} from '../src/lib/websocket-client';
import { useGuestWebSocket } from '../src/features/guest-session/hooks/useGuestWebSocket';
import {
  saveGuestSession,
  clearGuestSession,
  retrieveGuestSession,
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
  public recordedCloseCode: number | null = null;
  public recordedCloseReason: string | null = null;

  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  constructor(destinationUrl: string) {
    this.destinationUrl = destinationUrl;
    MockWebSocketChannel.instances.push(this);
  }

  public simulateOpenConnection(): void {
    this.readyState = WEB_SOCKET_OPEN_STATE;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  public simulateIncomingMessage(messagePayload: unknown): void {
    if (this.onmessage) {
      const serializedData: string =
        typeof messagePayload === 'string'
          ? messagePayload
          : JSON.stringify(messagePayload);
      this.onmessage(new MessageEvent('message', { data: serializedData }));
    }
  }

  public simulateServerClosure(
    closureCode: number = 1000,
    closureReason: string = 'Normal closure'
  ): void {
    this.readyState = WEB_SOCKET_CLOSED_STATE;
    this.recordedCloseCode = closureCode;
    this.recordedCloseReason = closureReason;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: closureCode, reason: closureReason }));
    }
  }

  public send(serializedMessage: string): void {
    this.recordedSentMessages.push(serializedMessage);
  }

  public close(
    closureCode: number = 1000,
    closureReason: string = 'Normal closure'
  ): void {
    this.simulateServerClosure(closureCode, closureReason);
  }
}

describe('GuestWebSocketClient & useGuestWebSocket', () => {
  const sampleSessionToken: string = 'session_token_xyz_456';
  const sampleStayIdentifier: string = 'stay_identifier_999';

  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocketChannel.clearInstances();
    vi.stubGlobal('WebSocket', MockWebSocketChannel);
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  describe('Connection Handshake and Heartbeats', () => {
    it('constructs correct query parameters with token upon initial connection', () => {
      const clientInstance: GuestWebSocketClient = new GuestWebSocketClient({
        sessionToken: sampleSessionToken,
        stayId: sampleStayIdentifier,
        serverUrl: 'wss://example.hotel.com/ws/guest',
      });

      clientInstance.connect();

      const createdSocketChannel: MockWebSocketChannel =
        MockWebSocketChannel.getLatestInstance();
      expect(createdSocketChannel.destinationUrl).toContain('wss://example.hotel.com/ws/guest');
      expect(createdSocketChannel.destinationUrl).toContain(`token=${sampleSessionToken}`);
      expect(clientInstance.getConnectionState()).toBe('connecting');

      createdSocketChannel.simulateOpenConnection();
      expect(clientInstance.getConnectionState()).toBe('connected');
    });

    it('transitions to connected and triggers onConnected callback upon receiving GUEST_CONNECTED', () => {
      let connectionCallbackInvoked: boolean = false;

      const clientInstance: GuestWebSocketClient = new GuestWebSocketClient({
        sessionToken: sampleSessionToken,
        stayId: sampleStayIdentifier,
        serverUrl: 'wss://example.hotel.com/ws/guest',
        onConnected: () => {
          connectionCallbackInvoked = true;
        },
      });

      clientInstance.connect();
      const createdSocketChannel: MockWebSocketChannel =
        MockWebSocketChannel.getLatestInstance();
      createdSocketChannel.simulateOpenConnection();

      createdSocketChannel.simulateIncomingMessage({
        type: 'GUEST_CONNECTED',
        stayId: sampleStayIdentifier,
      });

      expect(clientInstance.getConnectionState()).toBe('connected');
      expect(connectionCallbackInvoked).toBe(true);
    });

    it('automatically responds with PONG when receiving server PING heartbeat', () => {
      const clientInstance: GuestWebSocketClient = new GuestWebSocketClient({
        sessionToken: sampleSessionToken,
        serverUrl: 'wss://example.hotel.com/ws/guest',
      });

      clientInstance.connect();
      const createdSocketChannel: MockWebSocketChannel =
        MockWebSocketChannel.getLatestInstance();
      createdSocketChannel.simulateOpenConnection();

      const heartbeatTimestamp: number = 1710000000000;
      createdSocketChannel.simulateIncomingMessage({
        type: 'PING',
        timestamp: heartbeatTimestamp,
      });

      expect(createdSocketChannel.recordedSentMessages.length).toBe(1);
      const dispatchedPongMessage = JSON.parse(
        createdSocketChannel.recordedSentMessages[0]
      );
      expect(dispatchedPongMessage.type).toBe('PONG');
      expect(dispatchedPongMessage.timestamp).toBe(heartbeatTimestamp);
    });
  });

  describe('Order Status Updates & Last-Event-ID Retention', () => {
    it('records eventId from ORDER_STATUS_UPDATED and passes update to listener', () => {
      let receivedOrderUpdate: OrderStatusUpdatedPayload | null = null;

      const clientInstance: GuestWebSocketClient = new GuestWebSocketClient({
        sessionToken: sampleSessionToken,
        stayId: sampleStayIdentifier,
        serverUrl: 'wss://example.hotel.com/ws/guest',
        onOrderStatusUpdated: (orderUpdatePayload: OrderStatusUpdatedPayload) => {
          receivedOrderUpdate = orderUpdatePayload;
        },
      });

      clientInstance.connect();
      const createdSocketChannel: MockWebSocketChannel =
        MockWebSocketChannel.getLatestInstance();
      createdSocketChannel.simulateOpenConnection();

      createdSocketChannel.simulateIncomingMessage({
        type: 'ORDER_STATUS_UPDATED',
        eventId: 'evt_alpha_101',
        orderId: 'ord_kitchen_55',
        newStatus: 'PREPARING',
        updatedAt: '2026-11-06T12:00:00Z',
      });

      expect(clientInstance.getLastEventId()).toBe('evt_alpha_101');
      expect(receivedOrderUpdate).not.toBeNull();
      expect(receivedOrderUpdate?.orderId).toBe('ord_kitchen_55');
      expect(receivedOrderUpdate?.newStatus).toBe('PREPARING');
      expect(receivedOrderUpdate?.eventId).toBe('evt_alpha_101');
    });

    it('appends recorded lastEventId to destination URL upon subsequent reconnection', () => {
      const clientInstance: GuestWebSocketClient = new GuestWebSocketClient({
        sessionToken: sampleSessionToken,
        serverUrl: 'wss://example.hotel.com/ws/guest',
      });

      clientInstance.connect();
      const initialSocketChannel: MockWebSocketChannel =
        MockWebSocketChannel.getLatestInstance();
      initialSocketChannel.simulateOpenConnection();

      initialSocketChannel.simulateIncomingMessage({
        type: 'ORDER_STATUS_UPDATED',
        eventId: 'evt_persisted_777',
        orderId: 'ord_soup_01',
        newStatus: 'DELIVERED',
      });

      expect(clientInstance.getLastEventId()).toBe('evt_persisted_777');

      // Simulate unexpected network drop
      initialSocketChannel.simulateServerClosure(1006, 'Abnormal closure');

      expect(clientInstance.getConnectionState()).toBe('reconnecting');

      // Fast-forward backoff timer
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      const reconnectedSocketChannel: MockWebSocketChannel =
        MockWebSocketChannel.getLatestInstance();
      expect(reconnectedSocketChannel).not.toBe(initialSocketChannel);
      expect(reconnectedSocketChannel.destinationUrl).toContain('lastEventId=evt_persisted_777');
    });
  });

  describe('Exponential Backoff Reconnection', () => {
    it('schedules progressive backoff delays upon repeated dropped connections', () => {
      const clientInstance: GuestWebSocketClient = new GuestWebSocketClient({
        sessionToken: sampleSessionToken,
        serverUrl: 'wss://example.hotel.com/ws/guest',
      });

      clientInstance.connect();
      expect(MockWebSocketChannel.instances.length).toBe(1);

      // Attempt 1 fails
      MockWebSocketChannel.getLatestInstance().simulateServerClosure(1006, 'Drop 1');
      expect(clientInstance.getConnectionState()).toBe('reconnecting');

      // Before delay expires, no new socket
      vi.advanceTimersByTime(500);
      expect(MockWebSocketChannel.instances.length).toBe(1);

      // Advance past first backoff (~1000ms + jitter)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(MockWebSocketChannel.instances.length).toBe(2);

      // Attempt 2 fails
      MockWebSocketChannel.getLatestInstance().simulateServerClosure(1006, 'Drop 2');

      // Advance past second backoff (~2000ms + jitter)
      act(() => {
        vi.advanceTimersByTime(2500);
      });
      expect(MockWebSocketChannel.instances.length).toBe(3);
    });

    it('immediately reconnects without delay when browser window fires online event', () => {
      const clientInstance: GuestWebSocketClient = new GuestWebSocketClient({
        sessionToken: sampleSessionToken,
        serverUrl: 'wss://example.hotel.com/ws/guest',
      });

      clientInstance.connect();
      const initialSocketChannel: MockWebSocketChannel =
        MockWebSocketChannel.getLatestInstance();
      initialSocketChannel.simulateServerClosure(1006, 'Offline drop');

      expect(clientInstance.getConnectionState()).toBe('reconnecting');
      expect(MockWebSocketChannel.instances.length).toBe(1);

      // Dispatch online event
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      // Immediate reconnection triggered without waiting for timer
      expect(MockWebSocketChannel.instances.length).toBe(2);
    });
  });

  describe('Session Expiration (Close Code 4003 & SESSION_EXPIRED)', () => {
    it('terminates reconnection, clears session, and marks state expired on close code 4003', () => {
      saveGuestSession({
        sessionToken: sampleSessionToken,
        sessionId: sampleStayIdentifier,
        hotelId: 'htl_lagos',
        hotelName: 'Lagos Grand',
        roomId: '401',
        roomNumber: '401',
        stayId: sampleStayIdentifier,
        guestName: 'Valued Guest',
        expiresAt: new Date(Date.now() + 100000).toISOString(),
      });

      expect(retrieveGuestSession()).not.toBeNull();

      let sessionExpirationCallbackTriggered: boolean = false;

      const clientInstance: GuestWebSocketClient = new GuestWebSocketClient({
        sessionToken: sampleSessionToken,
        stayId: sampleStayIdentifier,
        serverUrl: 'wss://example.hotel.com/ws/guest',
        onSessionExpired: () => {
          sessionExpirationCallbackTriggered = true;
        },
      });

      clientInstance.connect();
      const createdSocketChannel: MockWebSocketChannel =
        MockWebSocketChannel.getLatestInstance();
      createdSocketChannel.simulateOpenConnection();

      // Trigger 4003 close code
      createdSocketChannel.simulateServerClosure(
        SESSION_EXPIRED_CLOSE_CODE,
        'Guest stay has ended'
      );

      expect(clientInstance.getConnectionState()).toBe('expired');
      expect(sessionExpirationCallbackTriggered).toBe(true);
      expect(retrieveGuestSession()).toBeNull();

      // Advance time to verify no reconnect happens
      act(() => {
        vi.advanceTimersByTime(35000);
      });
      expect(MockWebSocketChannel.instances.length).toBe(1);
    });

    it('handles SESSION_EXPIRED message by terminating and clearing session', () => {
      let sessionExpirationCallbackTriggered: boolean = false;

      const clientInstance: GuestWebSocketClient = new GuestWebSocketClient({
        sessionToken: sampleSessionToken,
        serverUrl: 'wss://example.hotel.com/ws/guest',
        onSessionExpired: () => {
          sessionExpirationCallbackTriggered = true;
        },
      });

      clientInstance.connect();
      const createdSocketChannel: MockWebSocketChannel =
        MockWebSocketChannel.getLatestInstance();
      createdSocketChannel.simulateOpenConnection();

      createdSocketChannel.simulateIncomingMessage({
        type: 'SESSION_EXPIRED',
      });

      expect(clientInstance.getConnectionState()).toBe('expired');
      expect(sessionExpirationCallbackTriggered).toBe(true);
    });
  });

  describe('useGuestWebSocket React Hook', () => {
    it('updates TanStack Query cache keys when ORDER_STATUS_UPDATED is received', () => {
      const mockQueryClient: QueryClient = new QueryClient();
      const initialCachedOrder = {
        id: 'ord_truffle_burger',
        orderId: 'ord_truffle_burger',
        status: 'PENDING',
        stayId: sampleStayIdentifier,
      };

      mockQueryClient.setQueryData(
        ['guest', 'orders', sampleStayIdentifier, 'ord_truffle_burger'],
        initialCachedOrder
      );

      const { result } = renderHook(() =>
        useGuestWebSocket({
          sessionToken: sampleSessionToken,
          stayId: sampleStayIdentifier,
          serverUrl: 'wss://example.hotel.com/ws/guest',
          queryClient: mockQueryClient,
        })
      );

      const activeSocketChannel: MockWebSocketChannel =
        MockWebSocketChannel.getLatestInstance();
      act(() => {
        activeSocketChannel.simulateOpenConnection();
      });

      act(() => {
        activeSocketChannel.simulateIncomingMessage({
          type: 'ORDER_STATUS_UPDATED',
          eventId: 'evt_timestamp_500',
          orderId: 'ord_truffle_burger',
          newStatus: 'DELIVERED',
          stayId: sampleStayIdentifier,
        });
      });

      expect(result.current.lastEventId).toBe('evt_timestamp_500');

      const updatedCachedOrder: Record<string, unknown> | undefined =
        mockQueryClient.getQueryData([
          'guest',
          'orders',
          sampleStayIdentifier,
          'ord_truffle_burger',
        ]);
      expect(updatedCachedOrder).toBeDefined();
      expect(updatedCachedOrder?.status).toBe('DELIVERED');
    });

    it('navigates to error recovery page and clears session when session expires', () => {
      let navigatedDestinationPath: string | null = null;
      const mockNavigateFunction = (destinationPath: string) => {
        navigatedDestinationPath = destinationPath;
      };

      renderHook(() =>
        useGuestWebSocket({
          sessionToken: sampleSessionToken,
          stayId: sampleStayIdentifier,
          serverUrl: 'wss://example.hotel.com/ws/guest',
          navigate: mockNavigateFunction,
        })
      );

      const activeSocketChannel: MockWebSocketChannel =
        MockWebSocketChannel.getLatestInstance();
      act(() => {
        activeSocketChannel.simulateOpenConnection();
      });

      act(() => {
        activeSocketChannel.simulateServerClosure(
          SESSION_EXPIRED_CLOSE_CODE,
          'Checkout completed'
        );
      });

      expect(navigatedDestinationPath).toBe('/error?reason=session_expired');
    });

    it('cleans up and closes socket channel upon component unmount', () => {
      const { unmount } = renderHook(() =>
        useGuestWebSocket({
          sessionToken: sampleSessionToken,
          stayId: sampleStayIdentifier,
          serverUrl: 'wss://example.hotel.com/ws/guest',
        })
      );

      const activeSocketChannel: MockWebSocketChannel =
        MockWebSocketChannel.getLatestInstance();
      act(() => {
        activeSocketChannel.simulateOpenConnection();
      });

      act(() => {
        unmount();
      });

      expect(activeSocketChannel.recordedCloseCode).toBe(1000);
      expect(activeSocketChannel.recordedCloseReason).toBe('Hook unmounted');
    });
  });
});
