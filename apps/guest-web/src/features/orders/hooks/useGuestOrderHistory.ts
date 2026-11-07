import { useQuery } from '@tanstack/react-query';
import { Order } from '@conciergeiq/contracts';
import { guestApiClient } from '../../../lib/api-client';
import { retrieveGuestSession } from '../../guest-session/session-store';

/**
 * Query key prefix nested under ['guest', 'orders'] so that real-time order events,
 * which invalidate that prefix, also refresh the stay history list.
 */
export const GUEST_ORDER_HISTORY_QUERY_KEY_PREFIX: readonly string[] = ['guest', 'orders', 'history'];

export function createGuestOrderHistoryQueryKey(stayIdentifier: string): string[] {
  return [...GUEST_ORDER_HISTORY_QUERY_KEY_PREFIX, stayIdentifier];
}

export interface UseGuestOrderHistoryOptions {
  stayIdentifierOverride?: string;
  enabled?: boolean;
}

export interface UseGuestOrderHistoryResult {
  ordersList: Order[];
  stayIdentifier: string;
  hasActiveSession: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetchOrders: () => Promise<unknown>;
}

/**
 * Fetches GET /api/v1/guest/orders and returns only orders belonging to the given stay,
 * newest first. The backend already scopes this endpoint to the session's stay; the
 * client-side filter is defence in depth so another stay's orders can never render.
 */
export async function fetchStayOrders(stayIdentifier: string): Promise<Order[]> {
  const rawResponse = await guestApiClient.get<Order[] | { orders: Order[] }>(
    '/api/v1/guest/orders'
  );

  let extractedOrders: Order[] = [];
  if (Array.isArray(rawResponse)) {
    extractedOrders = rawResponse;
  } else if (rawResponse && typeof rawResponse === 'object' && Array.isArray(rawResponse.orders)) {
    extractedOrders = rawResponse.orders;
  }

  return extractedOrders
    .filter((candidateOrder) => candidateOrder.stayId === stayIdentifier)
    .sort(
      (firstOrder, secondOrder) =>
        new Date(secondOrder.createdAt).getTime() - new Date(firstOrder.createdAt).getTime()
    );
}

/**
 * Lists the room service orders placed during the active guest stay.
 */
export function useGuestOrderHistory(
  hookOptions: UseGuestOrderHistoryOptions = {}
): UseGuestOrderHistoryResult {
  const activeGuestSession = retrieveGuestSession();
  const effectiveStayIdentifier: string =
    hookOptions.stayIdentifierOverride || activeGuestSession?.stayId || '';
  const hasActiveSession: boolean = effectiveStayIdentifier.length > 0;

  const ordersQuery = useQuery({
    queryKey: createGuestOrderHistoryQueryKey(effectiveStayIdentifier),
    queryFn: () => fetchStayOrders(effectiveStayIdentifier),
    enabled: (hookOptions.enabled ?? true) && hasActiveSession,
    staleTime: 15000,
  });

  return {
    ordersList: ordersQuery.data ?? [],
    stayIdentifier: effectiveStayIdentifier,
    hasActiveSession,
    isLoading: ordersQuery.isLoading,
    isError: ordersQuery.isError,
    error: ordersQuery.error instanceof Error ? ordersQuery.error : null,
    refetchOrders: ordersQuery.refetch,
  };
}
