import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { session } from '../../../lib/session';
import {
  StaffWebSocketClient,
  type ItemAvailabilityChangedPayload,
  type NewOrderReceivedPayload,
  type StaffConnectedPayload,
  type StaffOrderStatusChangedPayload,
  type StaffPaymentRecordedPayload,
  type StaffWebSocketConnectionState,
} from '../../../lib/websocket-client';
import { useAuth, useCurrentUser } from '../../auth/AuthProvider';
import { useRealtimeOptional } from '../../realtime/RealtimeProvider';

export interface UseStaffWebSocketOptions {
  accessToken?: string | null;
  hotelId?: string;
  serverUrl?: string;
  initialLastEventId?: string | null;
  enabled?: boolean;
  soundEnabled?: boolean;
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
  onSessionRevoked?: () => void;
  webSocketFactory?: (destinationUrl: string) => WebSocket;
  queryClient?: QueryClient;
  navigate?: (targetRoute: string) => void;
}

export interface UseStaffWebSocketResult {
  connectionStatus: StaffWebSocketConnectionState;
  lastEventId: string | null;
  isConnected: boolean;
  reconnect: () => void;
  disconnect: () => void;
  sendMessage: (messagePayload: unknown) => void;
  webSocketClient: StaffWebSocketClient | null;
}

function mapLegacyConnectionState(
  legacyState: 'connecting' | 'open' | 'reconnecting' | 'offline',
): StaffWebSocketConnectionState {
  switch (legacyState) {
    case 'open':
      return 'connected';
    case 'reconnecting':
      return 'reconnecting';
    case 'offline':
      return 'disconnected';
    case 'connecting':
    default:
      return 'connecting';
  }
}

/**
 * React hook managing the authenticated `/ws/staff` WebSocket lifecycle,
 * TanStack Query cache invalidations/updates, audio/visual alert events,
 * and automatic logout + `/login` redirection on `SESSION_REVOKED` (code `4001`).
 */
export function useStaffWebSocket(
  hookOptions: UseStaffWebSocketOptions = {},
): UseStaffWebSocketResult {
  const realtimeContext = useRealtimeOptional();

  let contextQueryClient: QueryClient | null = null;
  try {
    contextQueryClient = useQueryClient();
  } catch {
    contextQueryClient = null;
  }

  let contextNavigateFunction: ((targetRoute: string) => void) | null = null;
  try {
    contextNavigateFunction = useNavigate();
  } catch {
    contextNavigateFunction = null;
  }

  let contextHotelId: string | undefined;
  try {
    contextHotelId = useCurrentUser().hotelId;
  } catch {
    contextHotelId = undefined;
  }

  let contextSignOutFunction: ((notice?: string) => Promise<void>) | null =
    null;
  try {
    contextSignOutFunction = useAuth().signOut;
  } catch {
    contextSignOutFunction = null;
  }

  const effectiveQueryClient: QueryClient | null =
    hookOptions.queryClient ?? contextQueryClient;
  const effectiveNavigateFunction: ((targetRoute: string) => void) | null =
    hookOptions.navigate ?? contextNavigateFunction;
  const effectiveHotelId: string | undefined =
    hookOptions.hotelId ?? contextHotelId;

  const hasExplicitSocketOverrides = Boolean(
    hookOptions.accessToken !== undefined ||
      hookOptions.serverUrl !== undefined ||
      hookOptions.webSocketFactory !== undefined ||
      hookOptions.queryClient !== undefined ||
      hookOptions.navigate !== undefined,
  );

  // Reuse the active RealtimeProvider socket when mounted inside DashboardLayout without overrides
  const shouldDelegateToRealtimeProvider = Boolean(
    realtimeContext && !hasExplicitSocketOverrides,
  );

  const [connectionStatus, setConnectionStatus] =
    useState<StaffWebSocketConnectionState>('idle');
  const [lastEventIdentifier, setLastEventIdentifier] = useState<string | null>(
    hookOptions.initialLastEventId ?? null,
  );

  const clientInstanceReference = useRef<StaffWebSocketClient | null>(null);
  const hookOptionsReference = useRef<UseStaffWebSocketOptions>(hookOptions);
  hookOptionsReference.current = hookOptions;
  const signOutReference = useRef(contextSignOutFunction);
  signOutReference.current = contextSignOutFunction;

  const effectiveAccessToken: string | null =
    hookOptions.accessToken ?? session.getAccessToken();

  const isHookEnabled: boolean =
    !shouldDelegateToRealtimeProvider &&
    (hookOptions.enabled ?? true) &&
    typeof effectiveAccessToken === 'string' &&
    effectiveAccessToken.length > 0;

  const handleSessionRevoked = useCallback(() => {
    session.clear();
    effectiveQueryClient?.clear();

    if (signOutReference.current) {
      void signOutReference.current(
        'Your account was deactivated. Ask a manager if this is a mistake.',
      );
    }

    hookOptionsReference.current.onSessionRevoked?.();

    if (effectiveNavigateFunction) {
      effectiveNavigateFunction('/login');
    } else if (typeof window !== 'undefined' && window.location) {
      window.location.assign('/login');
    }
  }, [effectiveNavigateFunction, effectiveQueryClient]);

  useEffect(() => {
    if (shouldDelegateToRealtimeProvider) {
      return;
    }

    if (!isHookEnabled || !effectiveAccessToken) {
      if (clientInstanceReference.current !== null) {
        clientInstanceReference.current.disconnect();
        clientInstanceReference.current = null;
        setConnectionStatus('disconnected');
      }
      return;
    }

    const createdClient = new StaffWebSocketClient({
      accessToken: effectiveAccessToken,
      hotelId: effectiveHotelId,
      initialLastEventId: lastEventIdentifier,
      serverUrl: hookOptions.serverUrl,
      soundEnabled: hookOptions.soundEnabled ?? true,
      queryClient: effectiveQueryClient,
      webSocketFactory: hookOptions.webSocketFactory,
      onConnectionStateChange: (updatedState) => {
        setConnectionStatus(updatedState);
      },
      onConnected: (connectedPayload) => {
        if (connectedPayload.eventId) {
          setLastEventIdentifier(connectedPayload.eventId);
        }
        hookOptionsReference.current.onConnected?.(connectedPayload);
      },
      onNewOrderReceived: (newOrderPayload) => {
        if (newOrderPayload.eventId) {
          setLastEventIdentifier(newOrderPayload.eventId);
        }
        hookOptionsReference.current.onNewOrderReceived?.(newOrderPayload);
      },
      onOrderStatusChanged: (statusChangedPayload) => {
        if (statusChangedPayload.eventId) {
          setLastEventIdentifier(statusChangedPayload.eventId);
        }
        hookOptionsReference.current.onOrderStatusChanged?.(
          statusChangedPayload,
        );
      },
      onPaymentRecorded: (paymentRecordedPayload) => {
        if (paymentRecordedPayload.eventId) {
          setLastEventIdentifier(paymentRecordedPayload.eventId);
        }
        hookOptionsReference.current.onPaymentRecorded?.(
          paymentRecordedPayload,
        );
      },
      onItemAvailabilityChanged: (availabilityPayload) => {
        if (availabilityPayload.eventId) {
          setLastEventIdentifier(availabilityPayload.eventId);
        }
        hookOptionsReference.current.onItemAvailabilityChanged?.(
          availabilityPayload,
        );
      },
      onSessionRevoked: handleSessionRevoked,
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
    shouldDelegateToRealtimeProvider,
    isHookEnabled,
    effectiveAccessToken,
    effectiveHotelId,
    effectiveQueryClient,
    hookOptions.serverUrl,
    hookOptions.soundEnabled,
    hookOptions.webSocketFactory,
    handleSessionRevoked,
  ]);

  const reconnect = useCallback(() => {
    const activeClient = shouldDelegateToRealtimeProvider
      ? realtimeContext?.webSocketClient
      : clientInstanceReference.current;
    activeClient?.reconnect();
  }, [realtimeContext?.webSocketClient, shouldDelegateToRealtimeProvider]);

  const disconnect = useCallback(() => {
    const activeClient = shouldDelegateToRealtimeProvider
      ? realtimeContext?.webSocketClient
      : clientInstanceReference.current;
    activeClient?.disconnect('Manual disconnect');
  }, [realtimeContext?.webSocketClient, shouldDelegateToRealtimeProvider]);

  const sendMessage = useCallback(
    (messagePayload: unknown) => {
      const activeClient = shouldDelegateToRealtimeProvider
        ? realtimeContext?.webSocketClient
        : clientInstanceReference.current;
      activeClient?.send(messagePayload);
    },
    [realtimeContext?.webSocketClient, shouldDelegateToRealtimeProvider],
  );

  if (shouldDelegateToRealtimeProvider && realtimeContext) {
    const mappedStatus = mapLegacyConnectionState(realtimeContext.connection);
    return {
      connectionStatus: mappedStatus,
      lastEventId:
        realtimeContext.webSocketClient?.getLastEventId() ??
        realtimeContext.lastEventId,
      isConnected: mappedStatus === 'connected',
      reconnect,
      disconnect,
      sendMessage,
      webSocketClient: realtimeContext.webSocketClient,
    };
  }

  return {
    connectionStatus,
    lastEventId:
      clientInstanceReference.current?.getLastEventId() ?? lastEventIdentifier,
    isConnected: connectionStatus === 'connected',
    reconnect,
    disconnect,
    sendMessage,
    webSocketClient: clientInstanceReference.current,
  };
}
