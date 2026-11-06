import { clearGuestSession } from '../features/guest-session/session-store';

export type GuestWebSocketConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'expired';

export const SESSION_EXPIRED_CLOSE_CODE: number = 4003;
export const NORMAL_CLOSURE_CODE: number = 1000;
export const INITIAL_RECONNECT_DELAY_MILLISECONDS: number = 1000;
export const MAXIMUM_RECONNECT_DELAY_MILLISECONDS: number = 30000;
export const RECONNECTION_BACKOFF_MULTIPLIER: number = 2;
export const MAXIMUM_JITTER_MILLISECONDS: number = 250;

export interface OrderStatusUpdatedPayload {
  orderId: string;
  newStatus: string;
  updatedAt?: string;
  eventId?: string;
  stayId?: string;
  [additionalProperty: string]: unknown;
}

export interface GuestWebSocketMessageEnvelope {
  type: string;
  eventId?: string;
  orderId?: string;
  newStatus?: string;
  status?: string;
  stayId?: string;
  updatedAt?: string;
  timestamp?: number;
  session?: unknown;
  payload?: Record<string, unknown>;
  [additionalProperty: string]: unknown;
}

export interface GuestWebSocketClientConfiguration {
  sessionToken: string;
  stayId?: string;
  initialLastEventId?: string | null;
  serverUrl?: string;
  onConnectionStateChange?: (connectionState: GuestWebSocketConnectionState) => void;
  onOrderStatusUpdated?: (orderUpdatePayload: OrderStatusUpdatedPayload) => void;
  onSessionExpired?: () => void;
  onConnected?: (connectionEventPayload?: unknown) => void;
  webSocketFactory?: (destinationUrl: string) => WebSocket;
}

/**
 * Resilient guest WebSocket client with exponential backoff and Last-Event-ID reconnection replay.
 */
export class GuestWebSocketClient {
  private activeWebSocketInstance: WebSocket | null = null;
  private currentConnectionState: GuestWebSocketConnectionState = 'idle';
  private recordedLastEventIdentifier: string | null = null;
  private reconnectionTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectionAttemptCounter: number = 0;
  private clientManuallyDisconnected: boolean = false;
  private sessionPermanentlyExpired: boolean = false;

  private readonly clientConfiguration: GuestWebSocketClientConfiguration;

  constructor(clientConfiguration: GuestWebSocketClientConfiguration) {
    this.clientConfiguration = clientConfiguration;
    this.recordedLastEventIdentifier = clientConfiguration.initialLastEventId ?? null;
  }

  public getConnectionState(): GuestWebSocketConnectionState {
    return this.currentConnectionState;
  }

  public getLastEventId(): string | null {
    return this.recordedLastEventIdentifier;
  }

  public isConnected(): boolean {
    return (
      this.currentConnectionState === 'connected' &&
      this.activeWebSocketInstance !== null &&
      this.activeWebSocketInstance.readyState === WebSocket.OPEN
    );
  }

  public connect(): void {
    if (this.sessionPermanentlyExpired) {
      return;
    }

    if (this.clientManuallyDisconnected) {
      this.clientManuallyDisconnected = false;
    }

    if (
      this.activeWebSocketInstance !== null &&
      (this.activeWebSocketInstance.readyState === WebSocket.OPEN ||
        this.activeWebSocketInstance.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (this.reconnectionTimeoutTimer !== null) {
      clearTimeout(this.reconnectionTimeoutTimer);
      this.reconnectionTimeoutTimer = null;
    }

    const nextConnectionState: GuestWebSocketConnectionState =
      this.reconnectionAttemptCounter > 0 ? 'reconnecting' : 'connecting';
    this.setConnectionState(nextConnectionState);

    const destinationUrl: string = this.constructConnectionUrl();

    try {
      const socketInstance: WebSocket = this.clientConfiguration.webSocketFactory
        ? this.clientConfiguration.webSocketFactory(destinationUrl)
        : new WebSocket(destinationUrl);

      this.activeWebSocketInstance = socketInstance;

      socketInstance.onopen = this.handleSocketOpen;
      socketInstance.onmessage = this.handleSocketMessage;
      socketInstance.onclose = this.handleSocketClose;
      socketInstance.onerror = this.handleSocketError;

      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('online', this.handleBrowserOnlineEvent);
      }
    } catch (connectionInstantiationError) {
      this.scheduleReconnectionAttempt();
    }
  }

  public disconnect(disconnectReason: string = 'Client disconnected'): void {
    this.clientManuallyDisconnected = true;

    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('online', this.handleBrowserOnlineEvent);
    }

    if (this.reconnectionTimeoutTimer !== null) {
      clearTimeout(this.reconnectionTimeoutTimer);
      this.reconnectionTimeoutTimer = null;
    }

    if (this.activeWebSocketInstance !== null) {
      const socketToClose: WebSocket = this.activeWebSocketInstance;
      this.activeWebSocketInstance = null;

      try {
        socketToClose.close(NORMAL_CLOSURE_CODE, disconnectReason);
      } catch (closeError) {
        // Disregard closure exceptions during teardown
      }
    }

    this.setConnectionState('disconnected');
  }

  public reconnect(): void {
    this.clientManuallyDisconnected = false;
    this.reconnectionAttemptCounter = 0;

    if (this.reconnectionTimeoutTimer !== null) {
      clearTimeout(this.reconnectionTimeoutTimer);
      this.reconnectionTimeoutTimer = null;
    }

    if (this.activeWebSocketInstance !== null) {
      const socketToClose: WebSocket = this.activeWebSocketInstance;
      this.activeWebSocketInstance = null;

      try {
        socketToClose.close(NORMAL_CLOSURE_CODE, 'Manual reconnection initiated');
      } catch (closeError) {
        // Disregard closure exceptions during reconnection
      }
    }

    this.connect();
  }

  public send(messagePayload: unknown): void {
    if (
      this.activeWebSocketInstance !== null &&
      this.activeWebSocketInstance.readyState === WebSocket.OPEN
    ) {
      const serializedMessagePayload: string =
        typeof messagePayload === 'string'
          ? messagePayload
          : JSON.stringify(messagePayload);
      this.activeWebSocketInstance.send(serializedMessagePayload);
    }
  }

  private constructConnectionUrl(): string {
    const configuredServerUrl: string | undefined = this.clientConfiguration.serverUrl;
    let baseWebSocketUrl: string;

    if (configuredServerUrl && configuredServerUrl.length > 0) {
      baseWebSocketUrl = configuredServerUrl;
    } else if (typeof window !== 'undefined' && window.location) {
      const protocolPrefix: string =
        window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostAddress: string = window.location.host;
      baseWebSocketUrl = `${protocolPrefix}//${hostAddress}/ws/guest`;
    } else {
      baseWebSocketUrl = 'ws://localhost:3000/ws/guest';
    }

    const urlObject: URL = new URL(baseWebSocketUrl, 'http://localhost');
    urlObject.searchParams.set('token', this.clientConfiguration.sessionToken);

    if (
      this.recordedLastEventIdentifier !== null &&
      this.recordedLastEventIdentifier.length > 0
    ) {
      urlObject.searchParams.set('lastEventId', this.recordedLastEventIdentifier);
    }

    if (baseWebSocketUrl.startsWith('ws://') || baseWebSocketUrl.startsWith('wss://')) {
      return urlObject.toString();
    }

    const transformedProtocol: string =
      urlObject.protocol === 'https:' ? 'wss:' : 'ws:';
    const finalPortString: string = urlObject.port ? `:${urlObject.port}` : '';
    return `${transformedProtocol}//${urlObject.hostname}${finalPortString}${urlObject.pathname}${urlObject.search}`;
  }

  private handleSocketOpen = (): void => {
    this.reconnectionAttemptCounter = 0;
    this.setConnectionState('connected');
  };

  private handleSocketMessage = (messageEvent: MessageEvent): void => {
    try {
      const rawPayloadText: string =
        typeof messageEvent.data === 'string'
          ? messageEvent.data
          : String(messageEvent.data);
      const parsedEnvelope: GuestWebSocketMessageEnvelope = JSON.parse(rawPayloadText);
      this.processIncomingMessageEnvelope(parsedEnvelope);
    } catch (jsonParsingError) {
      // Discard payloads that are not structured JSON
    }
  };

  private processIncomingMessageEnvelope(
    messageEnvelope: GuestWebSocketMessageEnvelope
  ): void {
    if (!messageEnvelope || typeof messageEnvelope.type !== 'string') {
      return;
    }

    if (messageEnvelope.type === 'PING') {
      const currentTimestamp: number = Date.now();
      this.send({
        type: 'PONG',
        timestamp: messageEnvelope.timestamp ?? currentTimestamp,
      });
      return;
    }

    if (
      messageEnvelope.type === 'GUEST_CONNECTED' ||
      messageEnvelope.type === 'GUEST_SESSION_CONNECTED'
    ) {
      this.setConnectionState('connected');
      if (this.clientConfiguration.onConnected) {
        this.clientConfiguration.onConnected(messageEnvelope);
      }
      return;
    }

    if (messageEnvelope.type === 'SESSION_EXPIRED') {
      this.handlePermanentSessionExpiration();
      return;
    }

    if (messageEnvelope.type === 'ORDER_STATUS_UPDATED') {
      const candidateEventIdentifier: unknown =
        messageEnvelope.eventId ?? messageEnvelope.payload?.eventId;
      if (
        typeof candidateEventIdentifier === 'string' &&
        candidateEventIdentifier.length > 0
      ) {
        this.recordedLastEventIdentifier = candidateEventIdentifier;
      }

      const extractedOrderId: string =
        messageEnvelope.orderId ??
        (messageEnvelope.payload?.orderId as string | undefined) ??
        '';

      const extractedNewStatus: string =
        messageEnvelope.newStatus ??
        messageEnvelope.status ??
        (messageEnvelope.payload?.newStatus as string | undefined) ??
        (messageEnvelope.payload?.status as string | undefined) ??
        '';

      const extractedUpdatedAt: string | undefined =
        messageEnvelope.updatedAt ??
        (messageEnvelope.payload?.updatedAt as string | undefined);

      const extractedStayId: string | undefined =
        messageEnvelope.stayId ??
        (messageEnvelope.payload?.stayId as string | undefined) ??
        this.clientConfiguration.stayId;

      if (this.clientConfiguration.onOrderStatusUpdated) {
        this.clientConfiguration.onOrderStatusUpdated({
          orderId: extractedOrderId,
          newStatus: extractedNewStatus,
          updatedAt: extractedUpdatedAt,
          eventId: this.recordedLastEventIdentifier ?? undefined,
          stayId: extractedStayId,
        });
      }
    }
  }

  private handleSocketClose = (closeEvent: CloseEvent): void => {
    this.activeWebSocketInstance = null;

    if (closeEvent.code === SESSION_EXPIRED_CLOSE_CODE) {
      this.handlePermanentSessionExpiration();
      return;
    }

    if (this.sessionPermanentlyExpired) {
      this.setConnectionState('expired');
      return;
    }

    if (this.clientManuallyDisconnected) {
      this.setConnectionState('disconnected');
      return;
    }

    this.scheduleReconnectionAttempt();
  };

  private handleSocketError = (): void => {
    // Socket errors precede close events which handle reconnection logic
  };

  private scheduleReconnectionAttempt(): void {
    if (this.clientManuallyDisconnected || this.sessionPermanentlyExpired) {
      return;
    }

    if (this.reconnectionTimeoutTimer !== null) {
      clearTimeout(this.reconnectionTimeoutTimer);
      this.reconnectionTimeoutTimer = null;
    }

    this.reconnectionAttemptCounter += 1;

    const isBrowserCurrentlyOffline: boolean =
      typeof navigator !== 'undefined' && navigator.onLine === false;
    const nextReconnectingState: GuestWebSocketConnectionState =
      isBrowserCurrentlyOffline ? 'disconnected' : 'reconnecting';
    this.setConnectionState(nextReconnectingState);

    const backoffExponentMultiplier: number = Math.pow(
      RECONNECTION_BACKOFF_MULTIPLIER,
      this.reconnectionAttemptCounter - 1
    );
    const calculatedBackoffDelayMilliseconds: number =
      INITIAL_RECONNECT_DELAY_MILLISECONDS * backoffExponentMultiplier;
    const cappedBackoffDelayMilliseconds: number = Math.min(
      calculatedBackoffDelayMilliseconds,
      MAXIMUM_RECONNECT_DELAY_MILLISECONDS
    );
    const randomizedJitterOffsetMilliseconds: number = Math.floor(
      Math.random() * MAXIMUM_JITTER_MILLISECONDS
    );
    const totalScheduledDelayMilliseconds: number = Math.min(
      cappedBackoffDelayMilliseconds + randomizedJitterOffsetMilliseconds,
      MAXIMUM_RECONNECT_DELAY_MILLISECONDS
    );

    this.reconnectionTimeoutTimer = setTimeout(() => {
      this.reconnectionTimeoutTimer = null;
      this.connect();
    }, totalScheduledDelayMilliseconds);
  }

  private handleBrowserOnlineEvent = (): void => {
    if (this.clientManuallyDisconnected || this.sessionPermanentlyExpired) {
      return;
    }

    if (
      this.activeWebSocketInstance !== null &&
      this.activeWebSocketInstance.readyState === WebSocket.OPEN
    ) {
      return;
    }

    if (this.reconnectionTimeoutTimer !== null) {
      clearTimeout(this.reconnectionTimeoutTimer);
      this.reconnectionTimeoutTimer = null;
    }

    this.reconnectionAttemptCounter = 0;
    this.connect();
  };

  private handlePermanentSessionExpiration(): void {
    this.sessionPermanentlyExpired = true;
    this.clientManuallyDisconnected = true;

    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('online', this.handleBrowserOnlineEvent);
    }

    if (this.reconnectionTimeoutTimer !== null) {
      clearTimeout(this.reconnectionTimeoutTimer);
      this.reconnectionTimeoutTimer = null;
    }

    if (this.activeWebSocketInstance !== null) {
      const socketToClose: WebSocket = this.activeWebSocketInstance;
      this.activeWebSocketInstance = null;

      try {
        socketToClose.close(SESSION_EXPIRED_CLOSE_CODE, 'Session expired');
      } catch (closeError) {
        // Disregard closure exceptions during forced expiration shutdown
      }
    }

    clearGuestSession();
    this.setConnectionState('expired');

    if (this.clientConfiguration.onSessionExpired) {
      this.clientConfiguration.onSessionExpired();
    }
  }

  private setConnectionState(newConnectionState: GuestWebSocketConnectionState): void {
    if (this.currentConnectionState !== newConnectionState) {
      this.currentConnectionState = newConnectionState;

      if (this.clientConfiguration.onConnectionStateChange) {
        this.clientConfiguration.onConnectionStateChange(newConnectionState);
      }
    }
  }
}
