import type { QueryClient } from '@tanstack/react-query';
import type {
  MenuCategory,
  MenuItem,
  Order,
  OrderStatus,
  PaymentMethod,
  StaffSocketMessage,
} from './api-types';
import { config } from './config';
import { queryKeys } from './query-keys';
import { session } from './session';
import { markOrderAsFlashing, playNewOrderChime } from './sound';
import { playNewOrderChime } from './sound';

export type StaffWebSocketConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'revoked';

export type ConnectionState =
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'offline';

/** Close code sent by the server when a staff account is deactivated or session is revoked. */
export const SESSION_REVOKED_CLOSE_CODE: number = 4001;

/** Close code sent by the API when the access token is invalid or expired. */
export const UNAUTHORIZED_CLOSE_CODE: number = 4401;

export const NORMAL_CLOSURE_CODE: number = 1000;
export const INITIAL_RECONNECT_DELAY_MILLISECONDS: number = 1000;
export const MAXIMUM_RECONNECT_DELAY_MILLISECONDS: number = 30_000;
export const RECONNECTION_BACKOFF_MULTIPLIER: number = 2;
export const MAXIMUM_JITTER_MILLISECONDS: number = 250;

export const STAFF_NEW_ORDER_EVENT = 'staff:new-order';
export const STAFF_AUDIO_ALERT_EVENT = 'staff:audio-alert';
export const STAFF_ORDER_STATUS_CHANGED_EVENT = 'staff:order-status-changed';
export const STAFF_PAYMENT_RECORDED_EVENT = 'staff:payment-recorded';
export const STAFF_ITEM_AVAILABILITY_CHANGED_EVENT =
  'staff:item-availability-changed';
export const STAFF_ORDER_ESCALATED_EVENT = 'staff:order-escalated';
export const STAFF_SESSION_REVOKED_EVENT = 'staff:session-revoked';

export interface StaffConnectedPayload {
  userId?: string;
  hotelId?: string;
  serverTime?: string;
  eventId?: string;
  [additionalProperty: string]: unknown;
}

export interface NewOrderReceivedPayload {
  orderId: string;
  orderNumber: number;
  roomNumber: string;
  totalAmount: number;
  itemsSummary: string;
  createdAt: string;
  eventId?: string;
  order?: Order;
  [additionalProperty: string]: unknown;
}

export interface StaffOrderStatusChangedPayload {
  orderId: string;
  orderNumber?: number;
  previousStatus?: OrderStatus;
  newStatus: OrderStatus;
  changedBy?: string;
  updatedAt: string;
  eventId?: string;
  [additionalProperty: string]: unknown;
}

export interface StaffPaymentRecordedPayload {
  orderId: string;
  orderNumber?: number;
  amount: number;
  method: PaymentMethod;
  recordedAt: string;
  eventId?: string;
  [additionalProperty: string]: unknown;
}

export interface ItemAvailabilityChangedPayload {
  itemId: string;
  itemName?: string;
  isAvailable: boolean;
  eventId?: string;
  [additionalProperty: string]: unknown;
}

export interface OrderEscalatedPayload {
  orderId: string;
  orderNumber: number;
  roomNumber: string;
  level: 1 | 2;
  recipientName: string;
  waitedSeconds: number;
  eventId?: string;
  [additionalProperty: string]: unknown;
}

export interface StaffWebSocketMessageEnvelope {
  type: string;
  eventId?: string;
  orderId?: string;
  orderNumber?: number;
  roomNumber?: string;
  totalAmount?: number;
  itemsSummary?: string;
  createdAt?: string;
  previousStatus?: OrderStatus;
  newStatus?: OrderStatus;
  status?: OrderStatus;
  changedBy?: string;
  updatedBy?: string;
  updatedAt?: string;
  itemId?: string;
  itemName?: string;
  isAvailable?: boolean;
  available?: boolean;
  amount?: number;
  method?: PaymentMethod;
  recordedAt?: string;
  timestamp?: number;
  order?: Order;
  payload?: Record<string, unknown>;
  [additionalProperty: string]: unknown;
}

export interface StaffWebSocketClientConfiguration {
  accessToken?: string | null;
  getAccessToken?: (
    shouldRenewToken: boolean,
  ) => Promise<string | null> | string | null;
  hotelId?: string;
  initialLastEventId?: string | null;
  serverUrl?: string;
  soundEnabled?: boolean;
  queryClient?: QueryClient | null;
  onConnectionStateChange?: (
    connectionState: StaffWebSocketConnectionState,
  ) => void;
  onConnected?: (connectedPayload: StaffConnectedPayload) => void;
  onNewOrderReceived?: (newOrderPayload: NewOrderReceivedPayload) => void;
  onOrderStatusChanged?: (
    statusChangedPayload: StaffOrderStatusChangedPayload,
  ) => void;
  onPaymentRecorded?: (
    paymentRecordedPayload: StaffPaymentRecordedPayload,
  ) => void;
  onItemAvailabilityChanged?: (
    availabilityPayload: ItemAvailabilityChangedPayload,
  ) => void;
  onOrderEscalated?: (escalatedPayload: OrderEscalatedPayload) => void;
  onSessionRevoked?: () => void;
  onUnauthorized?: () => void;
  onReconnected?: () => void;
  onMessage?: (parsedStaffMessage: StaffSocketMessage) => void;
  webSocketFactory?: (destinationUrl: string) => WebSocket;
}

function dispatchBrowserCustomEvent(
  eventName: string,
  eventDetailPayload: unknown,
): void {
  if (
    typeof window !== 'undefined' &&
    typeof window.dispatchEvent === 'function' &&
    typeof CustomEvent === 'function'
  ) {
    window.dispatchEvent(
      new CustomEvent(eventName, { detail: eventDetailPayload }),
    );
  }
}

/**
 * Updates cached order status across both hotel-scoped and generic order query keys.
 */
export function updateOrderStatusInQueryCache(
  queryClient: QueryClient,
  hotelId: string | undefined,
  statusChangedPayload: StaffOrderStatusChangedPayload,
): void {
  const targetOrderId = statusChangedPayload.orderId;
  const targetStatus = statusChangedPayload.newStatus;
  const targetUpdatedAt =
    statusChangedPayload.updatedAt || new Date().toISOString();

  if (!targetOrderId || !targetStatus) {
    return;
  }

  const applyStatusUpdateToOrder = (existingOrder: Order): Order => {
    if (existingOrder.id !== targetOrderId) {
      return existingOrder;
    }
    return {
      ...existingOrder,
      status: targetStatus,
      updatedAt: targetUpdatedAt,
    };
  };

  if (hotelId) {
    queryClient.setQueryData<Order[]>(
      queryKeys.orders(hotelId),
      (existingOrders) =>
        Array.isArray(existingOrders)
          ? existingOrders.map(applyStatusUpdateToOrder)
          : existingOrders,
    );

    queryClient.setQueryData<Order>(
      queryKeys.order(hotelId, targetOrderId),
      (existingOrderDetail) =>
        existingOrderDetail
          ? applyStatusUpdateToOrder(existingOrderDetail)
          : existingOrderDetail,
    );
  }

  queryClient.setQueriesData(
    {
      predicate: (queryInstance) =>
        queryInstance.queryKey.includes('orders'),
    },
    (existingCacheData: unknown) => {
      if (Array.isArray(existingCacheData)) {
        return existingCacheData.map((cachedItem) => {
          if (
            cachedItem &&
            typeof cachedItem === 'object' &&
            'id' in cachedItem &&
            (cachedItem as { id: string }).id === targetOrderId
          ) {
            return {
              ...(cachedItem as Record<string, unknown>),
              status: targetStatus,
              updatedAt: targetUpdatedAt,
            };
          }
          return cachedItem;
        });
      }

      if (
        existingCacheData &&
        typeof existingCacheData === 'object' &&
        'id' in existingCacheData &&
        (existingCacheData as { id: string }).id === targetOrderId
      ) {
        return {
          ...(existingCacheData as Record<string, unknown>),
          status: targetStatus,
          updatedAt: targetUpdatedAt,
        };
      }

      return existingCacheData;
    },
  );

  if (hotelId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.orders(hotelId) });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.payments(hotelId),
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.stays(hotelId) });
  } else {
    void queryClient.invalidateQueries({
      predicate: (queryInstance) => queryInstance.queryKey.includes('orders'),
    });
  }
}

/**
 * Updates a menu item's availability immediately across cached menu categories and item lists.
 */
export function updateMenuAvailabilityInQueryCache(
  queryClient: QueryClient,
  hotelId: string | undefined,
  availabilityPayload: ItemAvailabilityChangedPayload,
): void {
  const targetItemId = availabilityPayload.itemId;
  const updatedAvailability = availabilityPayload.isAvailable;

  if (!targetItemId) {
    return;
  }

  const updateItemRecord = (menuItemRecord: MenuItem & { available?: boolean }) => {
    if (menuItemRecord.id !== targetItemId) {
      return menuItemRecord;
    }
    return {
      ...menuItemRecord,
      isAvailable: updatedAvailability,
      available: updatedAvailability,
    };
  };

  const transformCachedMenuData = (existingMenuData: unknown): unknown => {
    if (Array.isArray(existingMenuData)) {
      return existingMenuData.map((elementRecord) => {
        if (
          elementRecord &&
          typeof elementRecord === 'object' &&
          'items' in elementRecord &&
          Array.isArray((elementRecord as MenuCategory).items)
        ) {
          const categoryRecord = elementRecord as MenuCategory;
          return {
            ...categoryRecord,
            items: categoryRecord.items.map(updateItemRecord),
          };
        }
        if (
          elementRecord &&
          typeof elementRecord === 'object' &&
          'id' in elementRecord
        ) {
          return updateItemRecord(
            elementRecord as MenuItem & { available?: boolean },
          );
        }
        return elementRecord;
      });
    }

    if (existingMenuData && typeof existingMenuData === 'object') {
      const menuEnvelope = existingMenuData as {
        categories?: MenuCategory[];
        items?: (MenuItem & { available?: boolean })[];
      };
      if (Array.isArray(menuEnvelope.categories)) {
        return {
          ...menuEnvelope,
          categories: menuEnvelope.categories.map((categoryRecord) => ({
            ...categoryRecord,
            items: categoryRecord.items.map(updateItemRecord),
          })),
        };
      }
      if (Array.isArray(menuEnvelope.items)) {
        return {
          ...menuEnvelope,
          items: menuEnvelope.items.map(updateItemRecord),
        };
      }
    }

    return existingMenuData;
  };

  if (hotelId) {
    queryClient.setQueryData(
      queryKeys.menu(hotelId),
      transformCachedMenuData,
    );
  }

  queryClient.setQueriesData(
    {
      predicate: (queryInstance) => queryInstance.queryKey.includes('menu'),
    },
    transformCachedMenuData,
  );

  if (hotelId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.menu(hotelId) });
  } else {
    void queryClient.invalidateQueries({
      predicate: (queryInstance) => queryInstance.queryKey.includes('menu'),
    });
  }
}

/**
 * Authenticated staff WebSocket client managing `/ws/staff`, tracking `lastEventId`
 * for seamless replay on reconnection, dispatching TanStack Query cache updates,
 * and emitting custom browser events for audio/visual alerts.
 */
export class StaffWebSocketClient {
  private static singletonInstance: StaffWebSocketClient | null = null;

  public static getInstance(
    configuration?: StaffWebSocketClientConfiguration,
  ): StaffWebSocketClient {
    if (!StaffWebSocketClient.singletonInstance) {
      StaffWebSocketClient.singletonInstance = new StaffWebSocketClient(
        configuration ?? {},
      );
    } else if (configuration) {
      StaffWebSocketClient.singletonInstance.updateConfiguration(configuration);
    }
    return StaffWebSocketClient.singletonInstance;
  }

  public static resetInstance(): void {
    if (StaffWebSocketClient.singletonInstance) {
      StaffWebSocketClient.singletonInstance.disconnect('Singleton reset');
      StaffWebSocketClient.singletonInstance = null;
    }
  }

  private activeWebSocketInstance: WebSocket | null = null;
  private currentConnectionState: StaffWebSocketConnectionState = 'idle';
  private recordedLastEventIdentifier: string | null = null;
  private reconnectionTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectionAttemptCounter: number = 0;
  private hasEstablishedConnectionBefore: boolean = false;
  private clientManuallyDisconnected: boolean = false;
  private sessionPermanentlyRevoked: boolean = false;
  private lastTokenWasRejected: boolean = false;
  private connectionGenerationCounter: number = 0;

  private clientConfiguration: StaffWebSocketClientConfiguration;

  constructor(clientConfiguration: StaffWebSocketClientConfiguration = {}) {
    this.clientConfiguration = { ...clientConfiguration };
    this.recordedLastEventIdentifier =
      clientConfiguration.initialLastEventId ?? null;
    StaffWebSocketClient.singletonInstance = this;
  }

  public updateConfiguration(
    partialConfiguration: Partial<StaffWebSocketClientConfiguration>,
  ): void {
    this.clientConfiguration = {
      ...this.clientConfiguration,
      ...partialConfiguration,
    };
    if (
      partialConfiguration.initialLastEventId !== undefined &&
      this.recordedLastEventIdentifier === null
    ) {
      this.recordedLastEventIdentifier =
        partialConfiguration.initialLastEventId;
    }
  }

  public getConnectionState(): StaffWebSocketConnectionState {
    return this.currentConnectionState;
  }

  public getLastEventId(): string | null {
    return this.recordedLastEventIdentifier;
  }

  public setLastEventId(eventIdentifier: string | null): void {
    this.recordedLastEventIdentifier = eventIdentifier;
  }

  public isConnected(): boolean {
    const openStateConstant =
      typeof WebSocket !== 'undefined' && typeof WebSocket.OPEN === 'number'
        ? WebSocket.OPEN
        : 1;
    return (
      this.currentConnectionState === 'connected' &&
      this.activeWebSocketInstance !== null &&
      (this.activeWebSocketInstance.readyState === openStateConstant ||
        this.activeWebSocketInstance.readyState === undefined)
    );
  }

  public connect(): void {
    if (this.sessionPermanentlyRevoked) {
      return;
    }

    if (this.clientManuallyDisconnected) {
      this.clientManuallyDisconnected = false;
    }

    const openStateConstant =
      typeof WebSocket !== 'undefined' && typeof WebSocket.OPEN === 'number'
        ? WebSocket.OPEN
        : 1;
    const connectingStateConstant =
      typeof WebSocket !== 'undefined' &&
      typeof WebSocket.CONNECTING === 'number'
        ? WebSocket.CONNECTING
        : 0;

    if (
      this.activeWebSocketInstance !== null &&
      (this.activeWebSocketInstance.readyState === openStateConstant ||
        this.activeWebSocketInstance.readyState === connectingStateConstant)
    ) {
      return;
    }

    if (this.reconnectionTimeoutTimer !== null) {
      clearTimeout(this.reconnectionTimeoutTimer);
      this.reconnectionTimeoutTimer = null;
    }

    const nextConnectionState: StaffWebSocketConnectionState =
      this.reconnectionAttemptCounter > 0 || this.hasEstablishedConnectionBefore
        ? 'reconnecting'
        : 'connecting';
    this.setConnectionState(nextConnectionState);

    this.registerBrowserLifecycleListeners();

    const currentGeneration = ++this.connectionGenerationCounter;
    const shouldRenewToken = this.lastTokenWasRejected;
    this.lastTokenWasRejected = false;

    if (this.clientConfiguration.getAccessToken) {
      try {
        const tokenOrPromise =
          this.clientConfiguration.getAccessToken(shouldRenewToken);
        if (tokenOrPromise instanceof Promise) {
          void tokenOrPromise
            .then((resolvedToken) => {
              if (
                this.clientManuallyDisconnected ||
                this.sessionPermanentlyRevoked ||
                this.connectionGenerationCounter !== currentGeneration
              ) {
                return;
              }
              this.openSocketWithAccessToken(resolvedToken);
            })
            .catch(() => {
              if (
                !this.clientManuallyDisconnected &&
                !this.sessionPermanentlyRevoked &&
                this.connectionGenerationCounter === currentGeneration
              ) {
                this.scheduleReconnectionAttempt(false);
              }
            });
          return;
        }
        this.openSocketWithAccessToken(tokenOrPromise);
        return;
      } catch {
        this.scheduleReconnectionAttempt(false);
        return;
      }
    }

    const synchronousToken =
      this.clientConfiguration.accessToken ?? session.getAccessToken();
    this.openSocketWithAccessToken(synchronousToken);
  }

  public disconnect(disconnectReason: string = 'Client disconnected'): void {
    this.clientManuallyDisconnected = true;
    this.connectionGenerationCounter += 1;

    this.unregisterBrowserLifecycleListeners();

    if (this.reconnectionTimeoutTimer !== null) {
      clearTimeout(this.reconnectionTimeoutTimer);
      this.reconnectionTimeoutTimer = null;
    }

    if (this.activeWebSocketInstance !== null) {
      const socketToClose = this.activeWebSocketInstance;
      this.activeWebSocketInstance = null;

      try {
        socketToClose.close(NORMAL_CLOSURE_CODE, disconnectReason);
      } catch {
        // Ignore errors thrown while closing an already closed socket
      }
    }

    if (!this.sessionPermanentlyRevoked) {
      this.setConnectionState('disconnected');
    }
  }

  public reconnect(): void {
    if (this.sessionPermanentlyRevoked) {
      return;
    }

    this.clientManuallyDisconnected = false;
    this.reconnectionAttemptCounter = 0;

    if (this.reconnectionTimeoutTimer !== null) {
      clearTimeout(this.reconnectionTimeoutTimer);
      this.reconnectionTimeoutTimer = null;
    }

    if (this.activeWebSocketInstance !== null) {
      const socketToClose = this.activeWebSocketInstance;
      this.activeWebSocketInstance = null;

      try {
        socketToClose.close(
          NORMAL_CLOSURE_CODE,
          'Manual reconnection initiated',
        );
      } catch {
        // Ignore closure errors during manual reconnect
      }
    }

    this.connect();
  }

  public send(messagePayload: unknown): void {
    const openStateConstant =
      typeof WebSocket !== 'undefined' && typeof WebSocket.OPEN === 'number'
        ? WebSocket.OPEN
        : 1;

    if (
      this.activeWebSocketInstance !== null &&
      (this.activeWebSocketInstance.readyState === openStateConstant ||
        this.activeWebSocketInstance.readyState === undefined) &&
      typeof this.activeWebSocketInstance.send === 'function'
    ) {
      const serializedPayload =
        typeof messagePayload === 'string'
          ? messagePayload
          : JSON.stringify(messagePayload);
      this.activeWebSocketInstance.send(serializedPayload);
    }
  }

  private openSocketWithAccessToken(accessToken: string | null | undefined): void {
    if (this.clientManuallyDisconnected || this.sessionPermanentlyRevoked) {
      return;
    }

    if (!accessToken) {
      this.clientConfiguration.onUnauthorized?.();
      this.setConnectionState('disconnected');
      return;
    }

    const destinationUrl = this.constructConnectionUrl(accessToken);

    try {
      const socketInstance = this.clientConfiguration.webSocketFactory
        ? this.clientConfiguration.webSocketFactory(destinationUrl)
        : new WebSocket(destinationUrl);

      this.activeWebSocketInstance = socketInstance;

      socketInstance.onopen = () => {
        if (this.activeWebSocketInstance !== socketInstance) {
          return;
        }
        this.reconnectionAttemptCounter = 0;
        this.setConnectionState('connected');
        if (this.hasEstablishedConnectionBefore) {
          this.clientConfiguration.onReconnected?.();
        }
        this.hasEstablishedConnectionBefore = true;
      };

      socketInstance.onmessage = (messageEvent: MessageEvent) => {
        if (this.activeWebSocketInstance !== socketInstance) {
          return;
        }
        this.handleSocketMessage(messageEvent);
      };

      socketInstance.onclose = (closeEvent: CloseEvent) => {
        if (this.activeWebSocketInstance !== socketInstance) {
          return;
        }
        this.handleSocketClose(closeEvent);
      };

      socketInstance.onerror = () => {
        // Socket errors are followed by onclose which schedules reconnection
      };
    } catch {
      this.scheduleReconnectionAttempt(false);
    }
  }

  private constructConnectionUrl(accessToken: string): string {
    const configuredServerUrl =
      this.clientConfiguration.serverUrl ?? config.realtimeUrl;
    let baseWebSocketUrl: string;

    if (configuredServerUrl && configuredServerUrl.length > 0) {
      baseWebSocketUrl = configuredServerUrl;
    } else if (typeof window !== 'undefined' && window.location) {
      const protocolPrefix =
        window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      baseWebSocketUrl = `${protocolPrefix}//${window.location.host}/ws/staff`;
    } else {
      baseWebSocketUrl = 'ws://localhost:3000/ws/staff';
    }

    const parsedUrl = new URL(baseWebSocketUrl, 'http://localhost');
    parsedUrl.searchParams.set('accessToken', accessToken);

    if (
      this.recordedLastEventIdentifier !== null &&
      this.recordedLastEventIdentifier.length > 0
    ) {
      parsedUrl.searchParams.set(
        'lastEventId',
        this.recordedLastEventIdentifier,
      );
    }

    if (
      baseWebSocketUrl.startsWith('ws://') ||
      baseWebSocketUrl.startsWith('wss://')
    ) {
      return parsedUrl.toString();
    }

    const transformedProtocol =
      parsedUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const portSuffix = parsedUrl.port ? `:${parsedUrl.port}` : '';
    return `${transformedProtocol}//${parsedUrl.hostname}${portSuffix}${parsedUrl.pathname}${parsedUrl.search}`;
  }

  private handleSocketMessage(messageEvent: MessageEvent): void {
    const rawData = messageEvent?.data;
    if (typeof rawData !== 'string') {
      return;
    }

    let parsedEnvelope: StaffWebSocketMessageEnvelope;
    try {
      parsedEnvelope = JSON.parse(rawData) as StaffWebSocketMessageEnvelope;
    } catch {
      return;
    }

    if (!parsedEnvelope || typeof parsedEnvelope.type !== 'string') {
      return;
    }

    // Track highest received eventId from either top-level or nested payload
    const candidateEventId =
      parsedEnvelope.eventId ??
      (parsedEnvelope.payload?.eventId as string | undefined);
    if (typeof candidateEventId === 'string' && candidateEventId.length > 0) {
      this.recordedLastEventIdentifier = candidateEventId;
    }

    // Handle PING / PONG heartbeat
    if (parsedEnvelope.type === 'PING') {
      this.send({
        type: 'PONG',
        timestamp: parsedEnvelope.timestamp ?? Date.now(),
      });
      return;
    }

    // Forward to legacy parseMessage callback if configured
    const legacyParsedMessage = parseMessage(rawData);
    if (legacyParsedMessage && this.clientConfiguration.onMessage) {
      this.clientConfiguration.onMessage(legacyParsedMessage);
    }

    this.dispatchTypedEvent(parsedEnvelope);
  }

  private dispatchTypedEvent(
    messageEnvelope: StaffWebSocketMessageEnvelope,
  ): void {
    const nestedPayload = messageEnvelope.payload ?? {};
    const activeQueryClient = this.clientConfiguration.queryClient;
    const activeHotelId =
      this.clientConfiguration.hotelId ??
      (nestedPayload.hotelId as string | undefined);

    switch (messageEnvelope.type) {
      case 'STAFF_CONNECTED':
      case 'STAFF_AUTHENTICATED': {
        this.setConnectionState('connected');
        const connectedPayload: StaffConnectedPayload = {
          userId:
            (nestedPayload.userId as string | undefined) ??
            (messageEnvelope.userId as string | undefined),
          hotelId: activeHotelId,
          serverTime:
            (nestedPayload.serverTime as string | undefined) ??
            (messageEnvelope.serverTime as string | undefined),
          eventId: this.recordedLastEventIdentifier ?? undefined,
        };
        this.clientConfiguration.onConnected?.(connectedPayload);
        break;
      }

      case 'NEW_ORDER_RECEIVED':
      case 'NEW_ORDER_ALERT': {
        const orderRecord =
          messageEnvelope.order ?? (nestedPayload.order as Order | undefined);
        const newOrderPayload: NewOrderReceivedPayload = {
          orderId:
            messageEnvelope.orderId ??
            (nestedPayload.orderId as string | undefined) ??
            orderRecord?.id ??
            '',
          orderNumber:
            messageEnvelope.orderNumber ??
            (nestedPayload.orderNumber as number | undefined) ??
            orderRecord?.number ??
            0,
          roomNumber:
            messageEnvelope.roomNumber ??
            (nestedPayload.roomNumber as string | undefined) ??
            orderRecord?.roomNumber ??
            '',
          totalAmount:
            messageEnvelope.totalAmount ??
            (nestedPayload.totalAmount as number | undefined) ??
            orderRecord?.totalAmount ??
            0,
          itemsSummary:
            messageEnvelope.itemsSummary ??
            (nestedPayload.itemsSummary as string | undefined) ??
            '',
          createdAt:
            messageEnvelope.createdAt ??
            (nestedPayload.createdAt as string | undefined) ??
            orderRecord?.createdAt ??
            new Date().toISOString(),
          eventId: this.recordedLastEventIdentifier ?? undefined,
          order: orderRecord,
        };

        if (activeQueryClient) {
          if (activeHotelId) {
            void activeQueryClient.invalidateQueries({
              queryKey: queryKeys.orders(activeHotelId),
            });
          }
          void activeQueryClient.invalidateQueries({
            predicate: (queryInstance) =>
              queryInstance.queryKey.includes('orders'),
          });
        }

        if (newOrderPayload.orderId) {
          markOrderAsFlashing(newOrderPayload.orderId);
        }

        if (this.clientConfiguration.soundEnabled ?? true) {
          void playNewOrderChime({
            deduplicateKey: newOrderPayload.orderId || 'staff-incoming-order',
          });
        if (this.clientConfiguration.soundEnabled ?? true) {
          playNewOrderChime();
        }

        dispatchBrowserCustomEvent(STAFF_NEW_ORDER_EVENT, newOrderPayload);
        dispatchBrowserCustomEvent(STAFF_AUDIO_ALERT_EVENT, newOrderPayload);
        this.clientConfiguration.onNewOrderReceived?.(newOrderPayload);
        break;
      }

      case 'ORDER_STATUS_CHANGED': {
        const extractedNewStatus =
          messageEnvelope.newStatus ??
          messageEnvelope.status ??
          (nestedPayload.newStatus as OrderStatus | undefined) ??
          (nestedPayload.status as OrderStatus | undefined) ??
          ('IN_PROGRESS' as OrderStatus);

        const statusChangedPayload: StaffOrderStatusChangedPayload = {
          orderId:
            messageEnvelope.orderId ??
            (nestedPayload.orderId as string | undefined) ??
            '',
          orderNumber:
            messageEnvelope.orderNumber ??
            (nestedPayload.orderNumber as number | undefined),
          previousStatus:
            messageEnvelope.previousStatus ??
            (nestedPayload.previousStatus as OrderStatus | undefined),
          newStatus: extractedNewStatus,
          changedBy:
            messageEnvelope.changedBy ??
            messageEnvelope.updatedBy ??
            (nestedPayload.changedBy as string | undefined) ??
            (nestedPayload.updatedBy as string | undefined),
          updatedAt:
            messageEnvelope.updatedAt ??
            (nestedPayload.updatedAt as string | undefined) ??
            new Date().toISOString(),
          eventId: this.recordedLastEventIdentifier ?? undefined,
        };

        if (activeQueryClient) {
          updateOrderStatusInQueryCache(
            activeQueryClient,
            activeHotelId,
            statusChangedPayload,
          );
        }

        dispatchBrowserCustomEvent(
          STAFF_ORDER_STATUS_CHANGED_EVENT,
          statusChangedPayload,
        );
        this.clientConfiguration.onOrderStatusChanged?.(statusChangedPayload);
        break;
      }

      case 'PAYMENT_RECORDED': {
        const paymentRecordedPayload: StaffPaymentRecordedPayload = {
          orderId:
            messageEnvelope.orderId ??
            (nestedPayload.orderId as string | undefined) ??
            '',
          orderNumber:
            messageEnvelope.orderNumber ??
            (nestedPayload.orderNumber as number | undefined),
          amount:
            messageEnvelope.amount ??
            (nestedPayload.amount as number | undefined) ??
            0,
          method:
            messageEnvelope.method ??
            (nestedPayload.method as PaymentMethod | undefined) ??
            'CARD',
          recordedAt:
            messageEnvelope.recordedAt ??
            (nestedPayload.recordedAt as string | undefined) ??
            new Date().toISOString(),
          eventId: this.recordedLastEventIdentifier ?? undefined,
        };

        if (activeQueryClient) {
          if (activeHotelId) {
            void activeQueryClient.invalidateQueries({
              queryKey: queryKeys.orders(activeHotelId),
            });
            void activeQueryClient.invalidateQueries({
              queryKey: queryKeys.payments(activeHotelId),
            });
            void activeQueryClient.invalidateQueries({
              queryKey: queryKeys.stays(activeHotelId),
            });
          } else {
            void activeQueryClient.invalidateQueries({
              predicate: (queryInstance) =>
                queryInstance.queryKey.includes('orders') ||
                queryInstance.queryKey.includes('payments') ||
                queryInstance.queryKey.includes('stays'),
            });
          }
        }

        dispatchBrowserCustomEvent(
          STAFF_PAYMENT_RECORDED_EVENT,
          paymentRecordedPayload,
        );
        this.clientConfiguration.onPaymentRecorded?.(paymentRecordedPayload);
        break;
      }

      case 'ITEM_AVAILABILITY_CHANGED': {
        const resolvedAvailability =
          typeof messageEnvelope.isAvailable === 'boolean'
            ? messageEnvelope.isAvailable
            : typeof messageEnvelope.available === 'boolean'
              ? messageEnvelope.available
              : typeof nestedPayload.isAvailable === 'boolean'
                ? (nestedPayload.isAvailable as boolean)
                : Boolean(nestedPayload.available);

        const availabilityPayload: ItemAvailabilityChangedPayload = {
          itemId:
            messageEnvelope.itemId ??
            (nestedPayload.itemId as string | undefined) ??
            '',
          itemName:
            messageEnvelope.itemName ??
            (nestedPayload.itemName as string | undefined),
          isAvailable: resolvedAvailability,
          eventId: this.recordedLastEventIdentifier ?? undefined,
        };

        if (activeQueryClient) {
          updateMenuAvailabilityInQueryCache(
            activeQueryClient,
            activeHotelId,
            availabilityPayload,
          );
        }

        dispatchBrowserCustomEvent(
          STAFF_ITEM_AVAILABILITY_CHANGED_EVENT,
          availabilityPayload,
        );
        this.clientConfiguration.onItemAvailabilityChanged?.(
          availabilityPayload,
        );
        break;
      }

      case 'ORDER_ESCALATED': {
        const escalatedPayload: OrderEscalatedPayload = {
          orderId:
            messageEnvelope.orderId ??
            (nestedPayload.orderId as string | undefined) ??
            '',
          orderNumber:
            messageEnvelope.orderNumber ??
            (nestedPayload.orderNumber as number | undefined) ??
            0,
          roomNumber:
            messageEnvelope.roomNumber ??
            (nestedPayload.roomNumber as string | undefined) ??
            '',
          level: ((nestedPayload.level as 1 | 2 | undefined) ?? 1),
          recipientName:
            (nestedPayload.recipientName as string | undefined) ?? '',
          waitedSeconds:
            (nestedPayload.waitedSeconds as number | undefined) ?? 0,
          eventId: this.recordedLastEventIdentifier ?? undefined,
        };

        if (activeQueryClient && activeHotelId) {
          void activeQueryClient.invalidateQueries({
            queryKey: queryKeys.escalations(activeHotelId),
          });
        }

        dispatchBrowserCustomEvent(
          STAFF_ORDER_ESCALATED_EVENT,
          escalatedPayload,
        );
        this.clientConfiguration.onOrderEscalated?.(escalatedPayload);
        break;
      }

      case 'SESSION_REVOKED': {
        this.handlePermanentSessionRevocation();
        break;
      }
    }
  }

  private handleSocketClose(closeEvent: CloseEvent): void {
    this.activeWebSocketInstance = null;

    if (closeEvent.code === SESSION_REVOKED_CLOSE_CODE) {
      this.handlePermanentSessionRevocation();
      return;
    }

    if (this.sessionPermanentlyRevoked) {
      this.setConnectionState('revoked');
      return;
    }

    if (this.clientManuallyDisconnected) {
      this.setConnectionState('disconnected');
      return;
    }

    const wasTokenRejected = closeEvent.code === UNAUTHORIZED_CLOSE_CODE;
    this.lastTokenWasRejected = wasTokenRejected;
    this.scheduleReconnectionAttempt(wasTokenRejected);
  }

  private scheduleReconnectionAttempt(wasTokenRejected: boolean): void {
    if (this.clientManuallyDisconnected || this.sessionPermanentlyRevoked) {
      return;
    }

    if (this.reconnectionTimeoutTimer !== null) {
      clearTimeout(this.reconnectionTimeoutTimer);
      this.reconnectionTimeoutTimer = null;
    }

    this.reconnectionAttemptCounter += 1;

    const isBrowserOffline =
      typeof navigator !== 'undefined' && navigator.onLine === false;
    this.setConnectionState(isBrowserOffline ? 'disconnected' : 'reconnecting');

    let scheduledDelayMilliseconds: number;
    if (wasTokenRejected && this.reconnectionAttemptCounter === 1) {
      scheduledDelayMilliseconds = 0;
    } else {
      const exponentialMultiplier = Math.pow(
        RECONNECTION_BACKOFF_MULTIPLIER,
        this.reconnectionAttemptCounter - 1,
      );
      const baseDelayMilliseconds = Math.min(
        INITIAL_RECONNECT_DELAY_MILLISECONDS * exponentialMultiplier,
        MAXIMUM_RECONNECT_DELAY_MILLISECONDS,
      );
      const jitterOffsetMilliseconds = Math.floor(
        Math.random() * MAXIMUM_JITTER_MILLISECONDS,
      );
      scheduledDelayMilliseconds = Math.min(
        baseDelayMilliseconds + jitterOffsetMilliseconds,
        MAXIMUM_RECONNECT_DELAY_MILLISECONDS,
      );
    }

    this.reconnectionTimeoutTimer = setTimeout(() => {
      this.reconnectionTimeoutTimer = null;
      this.connect();
    }, scheduledDelayMilliseconds);
  }

  private handlePermanentSessionRevocation(): void {
    this.sessionPermanentlyRevoked = true;
    this.clientManuallyDisconnected = true;

    this.unregisterBrowserLifecycleListeners();

    if (this.reconnectionTimeoutTimer !== null) {
      clearTimeout(this.reconnectionTimeoutTimer);
      this.reconnectionTimeoutTimer = null;
    }

    if (this.activeWebSocketInstance !== null) {
      const socketToClose = this.activeWebSocketInstance;
      this.activeWebSocketInstance = null;

      try {
        socketToClose.close(SESSION_REVOKED_CLOSE_CODE, 'Session revoked');
      } catch {
        // Ignore closure errors during forced revocation shutdown
      }
    }

    session.clear();
    this.clientConfiguration.queryClient?.clear();
    this.setConnectionState('revoked');

    dispatchBrowserCustomEvent(STAFF_SESSION_REVOKED_EVENT, {
      reason: 'deactivated',
    });
    this.clientConfiguration.onSessionRevoked?.();
  }

  private handleBrowserOnlineEvent = (): void => {
    if (this.clientManuallyDisconnected || this.sessionPermanentlyRevoked) {
      return;
    }

    if (this.isConnected()) {
      return;
    }

    if (this.reconnectionTimeoutTimer !== null) {
      clearTimeout(this.reconnectionTimeoutTimer);
      this.reconnectionTimeoutTimer = null;
    }

    this.reconnectionAttemptCounter = 0;
    this.connect();
  };

  private handleDocumentVisibilityChange = (): void => {
    if (this.clientManuallyDisconnected || this.sessionPermanentlyRevoked) {
      return;
    }

    if (
      typeof document !== 'undefined' &&
      document.visibilityState &&
      document.visibilityState !== 'visible'
    ) {
      return;
    }

    if (!this.isConnected()) {
      if (this.reconnectionTimeoutTimer !== null) {
        clearTimeout(this.reconnectionTimeoutTimer);
        this.reconnectionTimeoutTimer = null;
      }
      this.reconnectionAttemptCounter = 0;
      this.connect();
    } else {
      this.send({ type: 'PING', timestamp: Date.now() });
    }
  };

  private registerBrowserLifecycleListeners(): void {
    if (
      typeof window !== 'undefined' &&
      typeof window.addEventListener === 'function'
    ) {
      window.removeEventListener('online', this.handleBrowserOnlineEvent);
      window.addEventListener('online', this.handleBrowserOnlineEvent);
    }

    if (
      typeof document !== 'undefined' &&
      typeof document.addEventListener === 'function'
    ) {
      document.removeEventListener(
        'visibilitychange',
        this.handleDocumentVisibilityChange,
      );
      document.addEventListener(
        'visibilitychange',
        this.handleDocumentVisibilityChange,
      );
    }
  }

  private unregisterBrowserLifecycleListeners(): void {
    if (
      typeof window !== 'undefined' &&
      typeof window.removeEventListener === 'function'
    ) {
      window.removeEventListener('online', this.handleBrowserOnlineEvent);
    }

    if (
      typeof document !== 'undefined' &&
      typeof document.removeEventListener === 'function'
    ) {
      document.removeEventListener(
        'visibilitychange',
        this.handleDocumentVisibilityChange,
      );
    }
  }

  private setConnectionState(
    nextConnectionState: StaffWebSocketConnectionState,
  ): void {
    if (this.currentConnectionState !== nextConnectionState) {
      this.currentConnectionState = nextConnectionState;
      this.clientConfiguration.onConnectionStateChange?.(nextConnectionState);
    }
  }
}

export interface StaffSocketOptions {
  url: string;
  /** Returns an access token; `renew` asks for a fresh one after the server rejected the last. */
  getAccessToken(renew: boolean): Promise<string | null>;
  onMessage(message: StaffSocketMessage): void;
  onStateChange(state: ConnectionState): void;
  /** Called after a dropped connection comes back, so cached data can be refetched. */
  onReconnected(): void;
  /** Called when the server rejects the token and no new one can be obtained. */
  onUnauthorized(): void;
  createSocket?: (url: string) => WebSocket;
}

function mapStaffClientStateToLegacyConnectionState(
  clientState: StaffWebSocketConnectionState,
): ConnectionState {
  switch (clientState) {
    case 'connected':
      return 'open';
    case 'reconnecting':
      return typeof navigator !== 'undefined' && navigator.onLine === false
        ? 'offline'
        : 'reconnecting';
    case 'disconnected':
    case 'revoked':
      return 'offline';
    case 'idle':
    case 'connecting':
    default:
      return 'connecting';
  }
}

/**
 * Adapter around `StaffWebSocketClient` preserving the legacy `StaffSocket`
 * interface used by `RealtimeProvider`.
 */
export class StaffSocket {
  private readonly underlyingClient: StaffWebSocketClient;

  constructor(private readonly options: StaffSocketOptions) {
    this.underlyingClient = new StaffWebSocketClient({
      serverUrl: options.url,
      getAccessToken: (shouldRenew) => options.getAccessToken(shouldRenew),
      onMessage: (parsedMessage) => options.onMessage(parsedMessage),
      onConnectionStateChange: (clientState) =>
        options.onStateChange(
          mapStaffClientStateToLegacyConnectionState(clientState),
        ),
      onReconnected: () => options.onReconnected(),
      onUnauthorized: () => options.onUnauthorized(),
      webSocketFactory: options.createSocket,
      soundEnabled: false,
    });
  }

  public start(): void {
    this.underlyingClient.connect();
  }

  public stop(): void {
    this.underlyingClient.disconnect('Signed out');
  }

  public getClient(): StaffWebSocketClient {
    return this.underlyingClient;
  }
}

const KNOWN_TYPES = new Set<StaffSocketMessage['type']>([
  'STAFF_CONNECTED',
  'NEW_ORDER_RECEIVED',
  'ORDER_STATUS_CHANGED',
  'PAYMENT_RECORDED',
  'ITEM_AVAILABILITY_CHANGED',
  'SESSION_REVOKED',
  'ORDER_ESCALATED',
]);

/** Ignores anything that is not a well-formed message the dashboard knows. */
export function parseMessage(rawMessageData: unknown): StaffSocketMessage | null {
  if (typeof rawMessageData !== 'string') return null;
  try {
    const parsedPayload: unknown = JSON.parse(rawMessageData);
    if (
      parsedPayload &&
      typeof parsedPayload === 'object' &&
      KNOWN_TYPES.has(
        (parsedPayload as { type: StaffSocketMessage['type'] }).type,
      ) &&
      typeof (parsedPayload as { payload?: unknown }).payload === 'object' &&
      (parsedPayload as { payload?: unknown }).payload !== null
    ) {
      return parsedPayload as StaffSocketMessage;
    }
  } catch {
    // Not JSON: ignore.
  }
  return null;
}
