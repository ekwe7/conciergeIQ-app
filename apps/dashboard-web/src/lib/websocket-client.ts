import type { StaffSocketMessage } from './api-types';

export type ConnectionState = 'connecting' | 'open' | 'reconnecting' | 'offline';

/** The API closes with this code when the access token is invalid or expired. */
const UNAUTHORIZED_CLOSE_CODE = 4401;
const MAX_RETRY_DELAY_MS = 30_000;

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

/**
 * One WebSocket per signed-in tab, reconnecting with capped exponential
 * backoff. Events only make the dashboard fresher; the API stays the source
 * of truth, so every reconnect triggers a refetch.
 */
export class StaffSocket {
  private socket: WebSocket | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private attempts = 0;
  private hasConnectedBefore = false;
  private stopped = false;
  private tokenRejected = false;

  constructor(private readonly options: StaffSocketOptions) {}

  start(): void {
    this.stopped = false;
    window.addEventListener('online', this.handleOnline);
    void this.connect();
  }

  stop(): void {
    this.stopped = true;
    window.removeEventListener('online', this.handleOnline);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    const socket = this.socket;
    this.socket = null;
    socket?.close(1000, 'Signed out');
  }

  private handleOnline = (): void => {
    if (this.socket || this.stopped) return;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.attempts = 0;
    void this.connect();
  };

  private async connect(): Promise<void> {
    if (this.stopped) return;
    this.options.onStateChange(this.hasConnectedBefore ? 'reconnecting' : 'connecting');

    let token: string | null;
    try {
      token = await this.options.getAccessToken(this.tokenRejected);
    } catch {
      // Could not reach the server to renew the token: try again later.
      if (!this.stopped) this.scheduleReconnect(false);
      return;
    }
    this.tokenRejected = false;
    if (this.stopped) return;
    if (!token) {
      this.options.onUnauthorized();
      return;
    }

    const url = `${this.options.url}?accessToken=${encodeURIComponent(token)}`;
    const socket = this.options.createSocket ? this.options.createSocket(url) : new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      this.attempts = 0;
      this.options.onStateChange('open');
      if (this.hasConnectedBefore) this.options.onReconnected();
      this.hasConnectedBefore = true;
    };

    socket.onmessage = (event: MessageEvent) => {
      const message = parseMessage(event.data);
      if (message) this.options.onMessage(message);
    };

    socket.onclose = (event: CloseEvent) => {
      if (this.socket !== socket) return;
      this.socket = null;
      if (this.stopped) return;
      this.tokenRejected = event.code === UNAUTHORIZED_CLOSE_CODE;
      this.scheduleReconnect(this.tokenRejected);
    };
  }

  private scheduleReconnect(tokenRejected: boolean): void {
    this.attempts += 1;
    this.options.onStateChange(navigator.onLine === false ? 'offline' : 'reconnecting');
    // A rejected token is usually just expired: reconnect at once with a fresh one.
    const delay = tokenRejected && this.attempts === 1 ? 0 : Math.min(MAX_RETRY_DELAY_MS, 1000 * 2 ** (this.attempts - 1));
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.connect();
    }, delay);
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
export function parseMessage(data: unknown): StaffSocketMessage | null {
  if (typeof data !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(data);
    if (
      parsed &&
      typeof parsed === 'object' &&
      KNOWN_TYPES.has((parsed as { type: StaffSocketMessage['type'] }).type) &&
      typeof (parsed as { payload?: unknown }).payload === 'object'
    ) {
      return parsed as StaffSocketMessage;
    }
  } catch {
    // Not JSON: ignore.
  }
  return null;
}
