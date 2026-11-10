import { QueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStaffWebSocket } from '../src/features/orders/hooks/useStaffWebSocket';
import type { MenuCategory, Order } from '../src/lib/api-types';
import { queryKeys } from '../src/lib/query-keys';
import { session } from '../src/lib/session';
import {
  SESSION_REVOKED_CLOSE_CODE,
  STAFF_AUDIO_ALERT_EVENT,
  STAFF_ITEM_AVAILABILITY_CHANGED_EVENT,
  STAFF_NEW_ORDER_EVENT,
  STAFF_ORDER_STATUS_CHANGED_EVENT,
  STAFF_SESSION_REVOKED_EVENT,
  StaffWebSocketClient,
  type ItemAvailabilityChangedPayload,
  type NewOrderReceivedPayload,
  type StaffOrderStatusChangedPayload,
} from '../src/lib/websocket-client';
import { order } from './support';

const WEB_SOCKET_CONNECTING_STATE: number = 0;
const WEB_SOCKET_OPEN_STATE: number = 1;
const WEB_SOCKET_CLOSING_STATE: number = 2;
const WEB_SOCKET_CLOSED_STATE: number = 3;

class MockStaffWebSocketChannel {
  public static instances: MockStaffWebSocketChannel[] = [];

  public static clearInstances(): void {
    MockStaffWebSocketChannel.instances = [];
  }

  public static getLatestInstance(): MockStaffWebSocketChannel {
    const latestSocket =
      MockStaffWebSocketChannel.instances[
        MockStaffWebSocketChannel.instances.length - 1
      ];
    if (!latestSocket) {
      throw new Error('No MockStaffWebSocketChannel instances available');
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
    MockStaffWebSocketChannel.instances.push(this);
  }

  public simulateOpenConnection(): void {
    this.readyState = WEB_SOCKET_OPEN_STATE;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  public simulateIncomingMessage(messagePayload: unknown): void {
    if (this.onmessage) {
      const serializedData =
        typeof messagePayload === 'string'
          ? messagePayload
          : JSON.stringify(messagePayload);
      this.onmessage(new MessageEvent('message', { data: serializedData }));
    }
  }

  public simulateServerClosure(
    closureCode: number = 1000,
    closureReason: string = 'Normal closure',
  ): void {
    this.readyState = WEB_SOCKET_CLOSED_STATE;
    this.recordedCloseCode = closureCode;
    this.recordedCloseReason = closureReason;
    if (this.onclose) {
      this.onclose(
        new CloseEvent('close', { code: closureCode, reason: closureReason }),
      );
    }
  }

  public send(serializedMessage: string): void {
    this.recordedSentMessages.push(serializedMessage);
  }

  public close(
    closureCode: number = 1000,
    closureReason: string = 'Normal closure',
  ): void {
    this.simulateServerClosure(closureCode, closureReason);
  }
}

describe('StaffWebSocketClient & useStaffWebSocket', () => {
  const sampleAccessToken = 'jwt_staff_access_token_789';
  const sampleHotelIdentifier = 'hotel-azure-bay';

  beforeEach(() => {
    vi.useFakeTimers();
    MockStaffWebSocketChannel.clearInstances();
    StaffWebSocketClient.resetInstance();
    vi.stubGlobal('WebSocket', MockStaffWebSocketChannel);
    session.store({
      accessToken: sampleAccessToken,
      refreshToken: 'jwt_staff_refresh_token_123',
    });
  });

  afterEach(() => {
    StaffWebSocketClient.resetInstance();
    session.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('Singleton Management, Handshake & Heartbeats', () => {
    it('manages a singleton instance via StaffWebSocketClient.getInstance()', () => {
      const firstReference = StaffWebSocketClient.getInstance({
        accessToken: sampleAccessToken,
        hotelId: sampleHotelIdentifier,
      });
      const secondReference = StaffWebSocketClient.getInstance();

      expect(firstReference).toBe(secondReference);
    });

    it('connects to /ws/staff with accessToken query parameter and handles STAFF_CONNECTED', () => {
      let connectedCallbackTriggered = false;

      const staffSocketClient = StaffWebSocketClient.getInstance({
        accessToken: sampleAccessToken,
        hotelId: sampleHotelIdentifier,
        serverUrl: 'wss://api.conciergeiq.test/ws/staff',
        onConnected: () => {
          connectedCallbackTriggered = true;
        },
      });

      staffSocketClient.connect();

      const activeChannel = MockStaffWebSocketChannel.getLatestInstance();
      expect(activeChannel.destinationUrl).toContain(
        'wss://api.conciergeiq.test/ws/staff',
      );
      expect(activeChannel.destinationUrl).toContain(
        `accessToken=${sampleAccessToken}`,
      );
      expect(staffSocketClient.getConnectionState()).toBe('connecting');

      activeChannel.simulateOpenConnection();
      expect(staffSocketClient.getConnectionState()).toBe('connected');

      activeChannel.simulateIncomingMessage({
        type: 'STAFF_CONNECTED',
        eventId: 'evt_handshake_001',
        payload: {
          userId: 'staff-1',
          hotelId: sampleHotelIdentifier,
          serverTime: '2026-11-10T17:00:00.000Z',
        },
      });

      expect(connectedCallbackTriggered).toBe(true);
      expect(staffSocketClient.getLastEventId()).toBe('evt_handshake_001');
    });

    it('responds with PONG when receiving a server PING heartbeat', () => {
      const staffSocketClient = new StaffWebSocketClient({
        accessToken: sampleAccessToken,
        serverUrl: 'wss://api.conciergeiq.test/ws/staff',
      });

      staffSocketClient.connect();
      const activeChannel = MockStaffWebSocketChannel.getLatestInstance();
      activeChannel.simulateOpenConnection();

      const pingTimestamp = 1762794000000;
      activeChannel.simulateIncomingMessage({
        type: 'PING',
        timestamp: pingTimestamp,
      });

      expect(activeChannel.recordedSentMessages).toHaveLength(1);
      const sentPongPayload = JSON.parse(
        activeChannel.recordedSentMessages[0]!,
      ) as { type: string; timestamp: number };
      expect(sentPongPayload.type).toBe('PONG');
      expect(sentPongPayload.timestamp).toBe(pingTimestamp);
    });
  });

  describe('Event Dispatching, Cache Updates & Custom Window Alerts', () => {
    it('invalidates orders cache and emits audio/visual window events on NEW_ORDER_RECEIVED', () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      let receivedNewOrderPayload: NewOrderReceivedPayload | null = null;
      const recordedWindowNewOrderEvents: CustomEvent[] = [];
      const recordedWindowAudioEvents: CustomEvent[] = [];

      const handleWindowNewOrder = (windowEvent: Event) => {
        recordedWindowNewOrderEvents.push(windowEvent as CustomEvent);
      };
      const handleWindowAudioAlert = (windowEvent: Event) => {
        recordedWindowAudioEvents.push(windowEvent as CustomEvent);
      };

      window.addEventListener(STAFF_NEW_ORDER_EVENT, handleWindowNewOrder);
      window.addEventListener(STAFF_AUDIO_ALERT_EVENT, handleWindowAudioAlert);

      try {
        const staffSocketClient = new StaffWebSocketClient({
          accessToken: sampleAccessToken,
          hotelId: sampleHotelIdentifier,
          serverUrl: 'wss://api.conciergeiq.test/ws/staff',
          queryClient,
          onNewOrderReceived: (payload) => {
            receivedNewOrderPayload = payload;
          },
        });

        staffSocketClient.connect();
        const activeChannel = MockStaffWebSocketChannel.getLatestInstance();
        activeChannel.simulateOpenConnection();

        activeChannel.simulateIncomingMessage({
          type: 'NEW_ORDER_RECEIVED',
          eventId: 'evt_new_order_101',
          payload: {
            orderId: 'order-407',
            orderNumber: 1048,
            roomNumber: '407',
            totalAmount: 9100,
            itemsSummary: 'Egusi & pounded yam',
            createdAt: '2026-11-10T17:10:00.000Z',
          },
        });

        expect(staffSocketClient.getLastEventId()).toBe('evt_new_order_101');
        expect(receivedNewOrderPayload).toMatchObject({
          orderId: 'order-407',
          orderNumber: 1048,
          roomNumber: '407',
          itemsSummary: 'Egusi & pounded yam',
          eventId: 'evt_new_order_101',
        });

        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: queryKeys.orders(sampleHotelIdentifier),
        });
        expect(recordedWindowNewOrderEvents).toHaveLength(1);
        expect(recordedWindowAudioEvents).toHaveLength(1);
      } finally {
        window.removeEventListener(STAFF_NEW_ORDER_EVENT, handleWindowNewOrder);
        window.removeEventListener(
          STAFF_AUDIO_ALERT_EVENT,
          handleWindowAudioAlert,
        );
      }
    });

    it('updates order status in TanStack Query cache immediately on ORDER_STATUS_CHANGED', () => {
      const queryClient = new QueryClient();
      const initialOrderRecord = order({
        id: 'order-status-214',
        number: 1047,
        roomNumber: '214',
        status: 'PENDING',
      });

      queryClient.setQueryData<Order[]>(
        queryKeys.orders(sampleHotelIdentifier),
        [initialOrderRecord],
      );
      queryClient.setQueryData<Order>(
        queryKeys.order(sampleHotelIdentifier, 'order-status-214'),
        initialOrderRecord,
      );

      let receivedStatusChange: StaffOrderStatusChangedPayload | null = null;
      const recordedStatusWindowEvents: CustomEvent[] = [];
      const handleStatusWindowEvent = (windowEvent: Event) => {
        recordedStatusWindowEvents.push(windowEvent as CustomEvent);
      };
      window.addEventListener(
        STAFF_ORDER_STATUS_CHANGED_EVENT,
        handleStatusWindowEvent,
      );

      try {
        const staffSocketClient = new StaffWebSocketClient({
          accessToken: sampleAccessToken,
          hotelId: sampleHotelIdentifier,
          serverUrl: 'wss://api.conciergeiq.test/ws/staff',
          queryClient,
          onOrderStatusChanged: (payload) => {
            receivedStatusChange = payload;
          },
        });

        staffSocketClient.connect();
        const activeChannel = MockStaffWebSocketChannel.getLatestInstance();
        activeChannel.simulateOpenConnection();

        activeChannel.simulateIncomingMessage({
          type: 'ORDER_STATUS_CHANGED',
          eventId: 'evt_status_202',
          payload: {
            orderId: 'order-status-214',
            orderNumber: 1047,
            previousStatus: 'PENDING',
            newStatus: 'IN_PROGRESS',
            changedBy: 'Chidi Eze',
            updatedAt: '2026-11-10T17:15:00.000Z',
          },
        });

        expect(staffSocketClient.getLastEventId()).toBe('evt_status_202');
        expect(receivedStatusChange?.newStatus).toBe('IN_PROGRESS');

        const updatedOrdersList = queryClient.getQueryData<Order[]>(
          queryKeys.orders(sampleHotelIdentifier),
        );
        const updatedOrderDetail = queryClient.getQueryData<Order>(
          queryKeys.order(sampleHotelIdentifier, 'order-status-214'),
        );

        expect(updatedOrdersList?.[0]?.status).toBe('IN_PROGRESS');
        expect(updatedOrderDetail?.status).toBe('IN_PROGRESS');
        expect(recordedStatusWindowEvents).toHaveLength(1);
      } finally {
        window.removeEventListener(
          STAFF_ORDER_STATUS_CHANGED_EVENT,
          handleStatusWindowEvent,
        );
      }
    });

    it('updates menu item availability immediately in cache on ITEM_AVAILABILITY_CHANGED', () => {
      const queryClient = new QueryClient();
      const initialMenuCategories: MenuCategory[] = [
        {
          id: 'cat-mains',
          name: 'Mains',
          sortOrder: 0,
          availableFrom: null,
          availableUntil: null,
          isOpenNow: true,
          translations: {},
          items: [
            {
              id: 'item-jollof',
              categoryId: 'cat-mains',
              name: 'Jollof rice',
              description: null,
              price: 8500,
              photoUrl: null,
              isAvailable: true,
              isFeatured: false,
              pairsWith: [],
              translations: {},
            },
          ],
        },
      ];

      queryClient.setQueryData<MenuCategory[]>(
        queryKeys.menu(sampleHotelIdentifier),
        initialMenuCategories,
      );

      let receivedAvailabilityUpdate: ItemAvailabilityChangedPayload | null =
        null;
      const recordedMenuWindowEvents: CustomEvent[] = [];
      const handleMenuWindowEvent = (windowEvent: Event) => {
        recordedMenuWindowEvents.push(windowEvent as CustomEvent);
      };
      window.addEventListener(
        STAFF_ITEM_AVAILABILITY_CHANGED_EVENT,
        handleMenuWindowEvent,
      );

      try {
        const staffSocketClient = new StaffWebSocketClient({
          accessToken: sampleAccessToken,
          hotelId: sampleHotelIdentifier,
          serverUrl: 'wss://api.conciergeiq.test/ws/staff',
          queryClient,
          onItemAvailabilityChanged: (payload) => {
            receivedAvailabilityUpdate = payload;
          },
        });

        staffSocketClient.connect();
        const activeChannel = MockStaffWebSocketChannel.getLatestInstance();
        activeChannel.simulateOpenConnection();

        activeChannel.simulateIncomingMessage({
          type: 'ITEM_AVAILABILITY_CHANGED',
          eventId: 'evt_menu_303',
          payload: {
            itemId: 'item-jollof',
            itemName: 'Jollof rice',
            isAvailable: false,
          },
        });

        expect(staffSocketClient.getLastEventId()).toBe('evt_menu_303');
        expect(receivedAvailabilityUpdate).toMatchObject({
          itemId: 'item-jollof',
          isAvailable: false,
        });

        const updatedCategories = queryClient.getQueryData<MenuCategory[]>(
          queryKeys.menu(sampleHotelIdentifier),
        );
        expect(updatedCategories?.[0]?.items[0]?.isAvailable).toBe(false);
        expect(recordedMenuWindowEvents).toHaveLength(1);
      } finally {
        window.removeEventListener(
          STAFF_ITEM_AVAILABILITY_CHANGED_EVENT,
          handleMenuWindowEvent,
        );
      }
    });
  });

  describe('Reconnection with lastEventId, Backoff & Tab Visibility', () => {
    it('appends highest received lastEventId to connection URL upon reconnection', () => {
      const staffSocketClient = new StaffWebSocketClient({
        accessToken: sampleAccessToken,
        serverUrl: 'wss://api.conciergeiq.test/ws/staff',
      });

      staffSocketClient.connect();
      const firstChannel = MockStaffWebSocketChannel.getLatestInstance();
      firstChannel.simulateOpenConnection();

      firstChannel.simulateIncomingMessage({
        type: 'ORDER_STATUS_CHANGED',
        eventId: 'evt_latest_999',
        payload: {
          orderId: 'order-1',
          orderNumber: 1047,
          previousStatus: 'PENDING',
          newStatus: 'IN_PROGRESS',
          updatedAt: '2026-11-10T17:20:00.000Z',
        },
      });

      expect(staffSocketClient.getLastEventId()).toBe('evt_latest_999');

      // Simulate dropped connection
      firstChannel.simulateServerClosure(1006, 'Abnormal network drop');
      expect(staffSocketClient.getConnectionState()).toBe('reconnecting');

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      const reconnectedChannel = MockStaffWebSocketChannel.getLatestInstance();
      expect(reconnectedChannel).not.toBe(firstChannel);
      expect(reconnectedChannel.destinationUrl).toContain(
        `accessToken=${sampleAccessToken}`,
      );
      expect(reconnectedChannel.destinationUrl).toContain(
        'lastEventId=evt_latest_999',
      );
    });

    it('verifies socket liveness and triggers reconnect when document visibilitychange fires', () => {
      const staffSocketClient = new StaffWebSocketClient({
        accessToken: sampleAccessToken,
        serverUrl: 'wss://api.conciergeiq.test/ws/staff',
      });

      staffSocketClient.connect();
      const initialChannel = MockStaffWebSocketChannel.getLatestInstance();
      initialChannel.simulateOpenConnection();
      initialChannel.simulateServerClosure(1006, 'Background tab disconnected');

      expect(MockStaffWebSocketChannel.instances).toHaveLength(1);
      expect(staffSocketClient.getConnectionState()).toBe('reconnecting');

      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(MockStaffWebSocketChannel.instances).toHaveLength(2);
    });
  });

  describe('Session Revocation (SESSION_REVOKED & Close Code 4001)', () => {
    it('clears session, stops reconnecting, and triggers onSessionRevoked on close code 4001', () => {
      let revocationCallbackInvoked = false;
      const recordedRevocationEvents: CustomEvent[] = [];
      const handleRevokedEvent = (windowEvent: Event) => {
        recordedRevocationEvents.push(windowEvent as CustomEvent);
      };
      window.addEventListener(STAFF_SESSION_REVOKED_EVENT, handleRevokedEvent);

      try {
        const staffSocketClient = new StaffWebSocketClient({
          accessToken: sampleAccessToken,
          serverUrl: 'wss://api.conciergeiq.test/ws/staff',
          onSessionRevoked: () => {
            revocationCallbackInvoked = true;
          },
        });

        staffSocketClient.connect();
        const activeChannel = MockStaffWebSocketChannel.getLatestInstance();
        activeChannel.simulateOpenConnection();

        activeChannel.simulateServerClosure(
          SESSION_REVOKED_CLOSE_CODE,
          'Staff account deactivated',
        );

        expect(staffSocketClient.getConnectionState()).toBe('revoked');
        expect(revocationCallbackInvoked).toBe(true);
        expect(session.getAccessToken()).toBeNull();
        expect(session.getRefreshToken()).toBeNull();
        expect(recordedRevocationEvents).toHaveLength(1);

        // Verify no reconnect is scheduled after 4001
        act(() => {
          vi.advanceTimersByTime(35_000);
        });
        expect(MockStaffWebSocketChannel.instances).toHaveLength(1);
      } finally {
        window.removeEventListener(
          STAFF_SESSION_REVOKED_EVENT,
          handleRevokedEvent,
        );
      }
    });
  });

  describe('useStaffWebSocket React Hook', () => {
    it('connects upon mount, updates caches on events, and redirects to /login on SESSION_REVOKED (4001)', () => {
      const queryClient = new QueryClient();
      const initialOrderRecord = order({
        id: 'order-hook-1',
        number: 1099,
        roomNumber: '301',
        status: 'PENDING',
      });
      queryClient.setQueryData<Order[]>(
        queryKeys.orders(sampleHotelIdentifier),
        [initialOrderRecord],
      );

      let navigatedPath: string | null = null;
      const mockNavigate = (targetPath: string) => {
        navigatedPath = targetPath;
      };

      const { result, unmount } = renderHook(() =>
        useStaffWebSocket({
          accessToken: sampleAccessToken,
          hotelId: sampleHotelIdentifier,
          serverUrl: 'wss://api.conciergeiq.test/ws/staff',
          queryClient,
          navigate: mockNavigate,
        }),
      );

      const activeChannel = MockStaffWebSocketChannel.getLatestInstance();
      act(() => {
        activeChannel.simulateOpenConnection();
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionStatus).toBe('connected');

      act(() => {
        activeChannel.simulateIncomingMessage({
          type: 'ORDER_STATUS_CHANGED',
          eventId: 'evt_hook_555',
          payload: {
            orderId: 'order-hook-1',
            orderNumber: 1099,
            previousStatus: 'PENDING',
            newStatus: 'DELIVERED',
            updatedAt: '2026-11-10T17:30:00.000Z',
          },
        });
      });

      expect(result.current.lastEventId).toBe('evt_hook_555');
      const cachedOrders = queryClient.getQueryData<Order[]>(
        queryKeys.orders(sampleHotelIdentifier),
      );
      expect(cachedOrders?.[0]?.status).toBe('DELIVERED');

      // Trigger close code 4001 (account deactivated / session revoked)
      act(() => {
        activeChannel.simulateServerClosure(
          SESSION_REVOKED_CLOSE_CODE,
          'Deactivated',
        );
      });

      expect(navigatedPath).toBe('/login');
      expect(session.getAccessToken()).toBeNull();

      unmount();
    });
  });
});
