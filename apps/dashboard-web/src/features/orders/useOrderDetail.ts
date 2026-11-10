import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import type { Order } from '../../lib/api-types';
import { queryKeys } from '../../lib/query-keys';
import { useCurrentUser } from '../auth/AuthProvider';

function useSafeHotelId(explicitHotelId?: string): string {
  try {
    const currentUser = useCurrentUser();
    return explicitHotelId ?? currentUser.hotelId;
  } catch {
    return explicitHotelId ?? 'default-hotel';
  }
}

function extractOrderFromResponse(
  responsePayload: Order | { order: Order },
): Order {
  if (
    responsePayload &&
    typeof responsePayload === 'object' &&
    'order' in responsePayload &&
    responsePayload.order
  ) {
    return responsePayload.order;
  }
  return responsePayload as Order;
}

/**
 * Fetches fresh order details (`GET /api/v1/orders/:orderId`) while seeding
 * initial data from the live orders board cache when available.
 */
export function useOrderDetail(
  orderId: string | null | undefined,
  hotelIdOverride?: string,
): UseQueryResult<Order, Error> {
  const activeHotelId = useSafeHotelId(hotelIdOverride);
  const queryClient = useQueryClient();
  const normalizedOrderId = orderId ?? '';

  return useQuery<Order, Error>({
    queryKey: queryKeys.order(activeHotelId, normalizedOrderId),
    queryFn: async ({ signal }) => {
      const responsePayload = await api.get<Order | { order: Order }>(
        `/orders/${normalizedOrderId}`,
        { signal },
      );
      return extractOrderFromResponse(responsePayload);
    },
    enabled: Boolean(normalizedOrderId),
    initialData: () =>
      queryClient
        .getQueryData<Order[]>(queryKeys.orders(activeHotelId))
        ?.find((cachedOrder) => cachedOrder.id === normalizedOrderId),
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(queryKeys.orders(activeHotelId))?.dataUpdatedAt,
  });
}
