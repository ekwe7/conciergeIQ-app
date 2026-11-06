import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import {
  GuestWebSocketClient,
  GuestWebSocketConnectionState,
  OrderStatusUpdatedPayload,
} from '../../../lib/websocket-client';
import { retrieveGuestSession, clearGuestSession } from '../session-store';

export interface UseGuestWebSocketOptions {
  sessionToken?: string;
  stayId?: string;
  serverUrl?: string;
  initialLastEventId?: string | null;
  enabled?: boolean;
  onOrderStatusUpdated?: (orderUpdatePayload: OrderStatusUpdatedPayload) => void;
  onSessionExpired?: () => void;
  webSocketFactory?: (destinationUrl: string) => WebSocket;
  queryClient?: QueryClient;
  navigate?: (targetRoute: string) => void;
}

export interface UseGuestWebSocketResult {
  connectionStatus: GuestWebSocketConnectionState;
  lastEventId: string | null;
  isConnected: boolean;
  reconnect: () => void;
  disconnect: () => void;
  sendMessage: (messagePayload: unknown) => void;
  webSocketClient: GuestWebSocketClient | null;
}

/**
 * React hook connecting to /ws/guest, managing real-time lifecycle, TanStack Query updates,
 * and automatic session expiration redirection.
 */
export function useGuestWebSocket(
  hookOptions: UseGuestWebSocketOptions = {}
): UseGuestWebSocketResult {
  let contextQueryClient: QueryClient | null = null;
  try {
    contextQueryClient = useQueryClient();
  } catch (queryClientContextError) {
    contextQueryClient = null;
  }

  let contextNavigateFunction: ((targetRoute: string) => void) | null = null;
  try {
    contextNavigateFunction = useNavigate();
  } catch (navigationContextError) {
    contextNavigateFunction = null;
  }

  const effectiveQueryClient: QueryClient | null =
    hookOptions.queryClient ?? contextQueryClient;
  const effectiveNavigateFunction: ((targetRoute: string) => void) | null =
    hookOptions.navigate ?? contextNavigateFunction;

  const [connectionStatus, setConnectionStatus] =
    useState<GuestWebSocketConnectionState>('idle');
  const [lastEventIdentifier, setLastEventIdentifier] = useState<string | null>(
    hookOptions.initialLastEventId ?? null
  );

  const clientInstanceReference = useRef<GuestWebSocketClient | null>(null);
  const hookOptionsReference = useRef<UseGuestWebSocketOptions>(hookOptions);
  hookOptionsReference.current = hookOptions;

  const storedSessionState = retrieveGuestSession();
  const effectiveSessionToken: string | undefined =
    hookOptions.sessionToken ?? storedSessionState?.sessionToken;
  const effectiveStayIdentifier: string | undefined =
    hookOptions.stayId ?? storedSessionState?.stayId;

  const isHookEnabled: boolean =
    (hookOptions.enabled ?? true) &&
    typeof effectiveSessionToken === 'string' &&
    effectiveSessionToken.length > 0;

  const handleOrderStatusUpdated = useCallback(
    (orderUpdatePayload: OrderStatusUpdatedPayload) => {
      if (orderUpdatePayload.eventId) {
        setLastEventIdentifier(orderUpdatePayload.eventId);
      }

      if (effectiveQueryClient) {
        const targetStayIdentifier: string =
          orderUpdatePayload.stayId || effectiveStayIdentifier || '';
        const targetOrderIdentifier: string = orderUpdatePayload.orderId;

        if (targetOrderIdentifier.length > 0) {
          if (targetStayIdentifier.length > 0) {
            effectiveQueryClient.setQueryData(
              ['guest', 'orders', targetStayIdentifier, targetOrderIdentifier],
              (previousOrderRecord: Record<string, unknown> | null | undefined) => {
                if (!previousOrderRecord) {
                  return {
                    id: targetOrderIdentifier,
                    orderId: targetOrderIdentifier,
                    status: orderUpdatePayload.newStatus,
                    updatedAt:
                      orderUpdatePayload.updatedAt || new Date().toISOString(),
                    stayId: targetStayIdentifier,
                  };
                }
                return {
                  ...previousOrderRecord,
                  status: orderUpdatePayload.newStatus,
                  updatedAt:
                    orderUpdatePayload.updatedAt || new Date().toISOString(),
                };
              }
            );
          }

          effectiveQueryClient.setQueryData(
            ['orders', targetOrderIdentifier],
            (previousOrderRecord: Record<string, unknown> | null | undefined) => {
              if (!previousOrderRecord) {
                return {
                  id: targetOrderIdentifier,
                  orderId: targetOrderIdentifier,
                  status: orderUpdatePayload.newStatus,
                  updatedAt:
                    orderUpdatePayload.updatedAt || new Date().toISOString(),
                };
              }
              return {
                ...previousOrderRecord,
                status: orderUpdatePayload.newStatus,
                updatedAt:
                  orderUpdatePayload.updatedAt || new Date().toISOString(),
              };
            }
          );

          effectiveQueryClient.invalidateQueries({
            queryKey: ['guest', 'orders'],
          });
          effectiveQueryClient.invalidateQueries({
            queryKey: ['orders'],
          });
        }
      }

      if (hookOptionsReference.current.onOrderStatusUpdated) {
        hookOptionsReference.current.onOrderStatusUpdated(orderUpdatePayload);
      }
    },
    [effectiveQueryClient, effectiveStayIdentifier]
  );

  const handleSessionExpired = useCallback(() => {
    clearGuestSession();

    if (hookOptionsReference.current.onSessionExpired) {
      hookOptionsReference.current.onSessionExpired();
    }

    if (effectiveNavigateFunction) {
      effectiveNavigateFunction('/error?reason=session_expired');
    } else if (typeof window !== 'undefined' && window.location) {
      window.location.assign('/error?reason=session_expired');
    }
  }, [effectiveNavigateFunction]);

  useEffect(() => {
    if (!isHookEnabled || !effectiveSessionToken) {
      if (clientInstanceReference.current !== null) {
        clientInstanceReference.current.disconnect();
        clientInstanceReference.current = null;
        setConnectionStatus('disconnected');
      }
      return;
    }

    const createdClient: GuestWebSocketClient = new GuestWebSocketClient({
      sessionToken: effectiveSessionToken,
      stayId: effectiveStayIdentifier,
      initialLastEventId: lastEventIdentifier,
      serverUrl: hookOptions.serverUrl,
      webSocketFactory: hookOptions.webSocketFactory,
      onConnectionStateChange: (updatedState: GuestWebSocketConnectionState) => {
        setConnectionStatus(updatedState);
      },
      onOrderStatusUpdated: handleOrderStatusUpdated,
      onSessionExpired: handleSessionExpired,
    });

    clientInstanceReference.current = createdClient;
    createdClient.connect();

    return () => {
      createdClient.disconnect('Hook unmounted');
      if (clientInstanceReference.current === createdClient) {
        clientInstanceReference.current = null;
      }
    };
  }, [
    isHookEnabled,
    effectiveSessionToken,
    effectiveStayIdentifier,
    hookOptions.serverUrl,
    hookOptions.webSocketFactory,
    handleOrderStatusUpdated,
    handleSessionExpired,
  ]);

  const reconnect = useCallback(() => {
    if (clientInstanceReference.current !== null) {
      clientInstanceReference.current.reconnect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (clientInstanceReference.current !== null) {
      clientInstanceReference.current.disconnect('Manual disconnect');
    }
  }, []);

  const sendMessage = useCallback((messagePayload: unknown) => {
    if (clientInstanceReference.current !== null) {
      clientInstanceReference.current.send(messagePayload);
    }
  }, []);

  const isConnected: boolean = connectionStatus === 'connected';

  return {
    connectionStatus,
    lastEventId: lastEventIdentifier,
    isConnected,
    reconnect,
    disconnect,
    sendMessage,
    webSocketClient: clientInstanceReference.current,
  };
}
