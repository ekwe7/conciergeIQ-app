import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Order, OrderStatus } from '@conciergeiq/contracts';
import { guestApiClient } from '../../../lib/api-client';
import { retrieveGuestSession } from '../../guest-session/session-store';
import { useGuestWebSocket } from '../../guest-session/hooks/useGuestWebSocket';

export interface UseTrackOrderOptions {
  initialOrder?: Order | null;
  enabled?: boolean;
  pollingIntervalMilliseconds?: number;
  onStatusChange?: (newStatus: OrderStatus, previousStatus: OrderStatus | null) => void;
}

export interface UseTrackOrderResult {
  order: Order | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
  isWebSocketConnected: boolean;
  liveStatusAnnouncement: string;
}

/**
 * Maps an order status into a user-friendly spoken phrase for screen readers.
 */
function createStatusAnnouncementText(
  orderStatus: OrderStatus,
  cancellationReason?: string | null
): string {
  switch (orderStatus) {
    case 'PENDING':
      return 'Order received and awaiting staff acknowledgment.';
    case 'IN_PROGRESS':
      return 'Order is now in the kitchen being prepared.';
    case 'DELIVERED':
      return 'Order has been delivered to your room door.';
    case 'CANCELLED':
      return cancellationReason && cancellationReason.trim().length > 0
        ? `Order cancelled. Reason: ${cancellationReason.trim()}`
        : 'Order cancelled by staff.';
    default:
      return `Order status updated to ${orderStatus}.`;
  }
}

/**
 * Resilient order tracking hook combining TanStack Query caching,
 * instant WebSocket status updates, and automatic 30-second REST polling fallback
 * whenever the real-time WebSocket connection is offline.
 */
export function useTrackOrder(
  orderIdentifier: string | undefined,
  hookOptions: UseTrackOrderOptions = {}
): UseTrackOrderResult {
  const queryClient = useQueryClient();
  const activeGuestSession = retrieveGuestSession();

  const effectiveStayIdentifier: string = activeGuestSession?.stayId ?? '';
  const effectiveSessionToken: string = activeGuestSession?.sessionToken ?? '';

  const [liveStatusAnnouncement, setLiveStatusAnnouncement] = useState<string>('');
  const previousStatusReference = useRef<OrderStatus | null>(
    hookOptions.initialOrder?.status ?? null
  );

  const webSocketResult = useGuestWebSocket({
    sessionToken: effectiveSessionToken,
    stayId: effectiveStayIdentifier,
    onOrderStatusUpdated: (orderUpdatePayload) => {
      if (orderIdentifier && orderUpdatePayload.orderId === orderIdentifier) {
        const nextStatus = orderUpdatePayload.newStatus as OrderStatus;
        const previousStatus = previousStatusReference.current;

        if (previousStatus !== nextStatus) {
          previousStatusReference.current = nextStatus;
          const announcementMessage = createStatusAnnouncementText(nextStatus);
          setLiveStatusAnnouncement(announcementMessage);

          if (hookOptions.onStatusChange) {
            hookOptions.onStatusChange(nextStatus, previousStatus);
          }
        }
      }
    },
  });

  const isWebSocketConnected: boolean = webSocketResult.isConnected;
  const fallbackPollingInterval: number =
    hookOptions.pollingIntervalMilliseconds ?? 30000;

  const fetchOrderDetails = useCallback(async (): Promise<Order> => {
    if (!orderIdentifier) {
      throw new Error('Order identifier is required to track order progress.');
    }

    const endpointPath: string = `/api/v1/guest/orders/${encodeURIComponent(orderIdentifier)}`;
    const rawResponse = await guestApiClient.get<Order | { order: Order }>(endpointPath);

    if (rawResponse && typeof rawResponse === 'object' && 'order' in rawResponse) {
      return (rawResponse as { order: Order }).order;
    }

    return rawResponse as Order;
  }, [orderIdentifier]);

  const primaryQueryKey = [
    'guest',
    'orders',
    effectiveStayIdentifier,
    orderIdentifier ?? '',
  ];

  const {
    data: fetchedOrder,
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useQuery<Order, Error>({
    queryKey: primaryQueryKey,
    queryFn: fetchOrderDetails,
    enabled:
      (hookOptions.enabled ?? true) &&
      typeof orderIdentifier === 'string' &&
      orderIdentifier.length > 0,
    initialData: hookOptions.initialOrder ?? undefined,
    staleTime: 1000 * 15,
    refetchInterval: isWebSocketConnected ? false : fallbackPollingInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (fetchedOrder && fetchedOrder.status) {
      const currentFetchedStatus = fetchedOrder.status;
      const previousRecordedStatus = previousStatusReference.current;

      if (previousRecordedStatus !== currentFetchedStatus) {
        previousStatusReference.current = currentFetchedStatus;

        const cancellationReason =
          (fetchedOrder as { cancelReason?: string | null; rejectionReason?: string | null })
            .cancelReason ??
          (fetchedOrder as { cancelReason?: string | null; rejectionReason?: string | null })
            .rejectionReason ??
          null;

        const announcementText = createStatusAnnouncementText(
          currentFetchedStatus,
          cancellationReason
        );
        setLiveStatusAnnouncement(announcementText);

        if (hookOptions.onStatusChange) {
          hookOptions.onStatusChange(currentFetchedStatus, previousRecordedStatus);
        }
      }
    }
  }, [fetchedOrder, hookOptions]);

  const resolvedOrder: Order | null = fetchedOrder ?? hookOptions.initialOrder ?? null;

  return {
    order: resolvedOrder,
    isLoading: isLoading && resolvedOrder === null,
    isError,
    error: (queryError as Error | null) ?? null,
    refetch,
    isWebSocketConnected,
    liveStatusAnnouncement,
  };
}
