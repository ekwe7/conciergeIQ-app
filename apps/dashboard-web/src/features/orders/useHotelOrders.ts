import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '../../lib/api-client';
import { OrderStatus, type Order } from '../../lib/api-types';
import { queryKeys } from '../../lib/query-keys';
import { useCurrentUser } from '../auth/AuthProvider';

/**
 * 15-second polling fallback interval (in milliseconds) to keep the live orders
 * board synchronized even if the WebSocket connection drops temporarily.
 */
export const HOTEL_ORDERS_POLLING_INTERVAL_MS = 15_000;

/**
 * Canonical status column ordering for the Kanban Live Orders Board.
 */
export const ORDER_BOARD_COLUMNS: readonly OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.IN_PROGRESS,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

function useSafeHotelId(explicitHotelId?: string): string {
  try {
    const currentUser = useCurrentUser();
    return explicitHotelId ?? currentUser.hotelId;
  } catch {
    return explicitHotelId ?? 'default-hotel';
  }
}

/**
 * Sorts orders for a specific status column:
 * - Active statuses (`PENDING`, `IN_PROGRESS`) sort oldest first so the longest-waiting
 *   guest orders appear at the top of the queue.
 * - Terminal statuses (`DELIVERED`, `CANCELLED`) sort newest first.
 */
export function sortOrdersForColumn(
  columnStatus: OrderStatus,
  columnOrders: readonly Order[],
): Order[] {
  const isActiveColumn =
    columnStatus === OrderStatus.PENDING ||
    columnStatus === OrderStatus.IN_PROGRESS;

  const getOrderTimestampMs = (orderRecord: Order): number => {
    const referenceDateIso = isActiveColumn
      ? orderRecord.createdAt
      : orderRecord.updatedAt;
    return new Date(referenceDateIso).getTime();
  };

  return [...columnOrders].sort((firstOrder, secondOrder) =>
    isActiveColumn
      ? getOrderTimestampMs(firstOrder) - getOrderTimestampMs(secondOrder)
      : getOrderTimestampMs(secondOrder) - getOrderTimestampMs(firstOrder),
  );
}

/**
 * Groups a list of orders into the four canonical status buckets (`PENDING`,
 * `IN_PROGRESS`, `DELIVERED`, `CANCELLED`) sorted appropriately for each column.
 */
export function groupOrdersByStatus(
  ordersList: readonly Order[],
): Record<OrderStatus, Order[]> {
  const groupedOrders: Record<OrderStatus, Order[]> = {
    [OrderStatus.PENDING]: [],
    [OrderStatus.IN_PROGRESS]: [],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELLED]: [],
  };

  for (const orderRecord of ordersList) {
    if (groupedOrders[orderRecord.status]) {
      groupedOrders[orderRecord.status].push(orderRecord);
    }
  }

  for (const columnStatus of ORDER_BOARD_COLUMNS) {
    groupedOrders[columnStatus] = sortOrdersForColumn(
      columnStatus,
      groupedOrders[columnStatus],
    );
  }

  return groupedOrders;
}

export type UseHotelOrdersResult = UseQueryResult<Order[], Error> & {
  orders: Order[];
  ordersByStatus: Record<OrderStatus, Order[]>;
};

/**
 * Queries `GET /api/v1/orders` for the active hotel with a 15-second polling fallback
 * and returns both the raw order list and pre-grouped status columns.
 */
export function useHotelOrders(hotelIdOverride?: string): UseHotelOrdersResult {
  const activeHotelId = useSafeHotelId(hotelIdOverride);

  const queryResult = useQuery<Order[], Error>({
    queryKey: queryKeys.orders(activeHotelId),
    queryFn: async ({ signal }) => {
      const responsePayload = await api.get<Order[] | { orders: Order[] }>(
        '/orders',
        { signal },
      );
      if (Array.isArray(responsePayload)) {
        return responsePayload;
      }
      if (
        responsePayload &&
        typeof responsePayload === 'object' &&
        Array.isArray(responsePayload.orders)
      ) {
        return responsePayload.orders;
      }
      return [];
    },
    refetchInterval: HOTEL_ORDERS_POLLING_INTERVAL_MS,
  });

  const orders = useMemo(() => queryResult.data ?? [], [queryResult.data]);
  const ordersByStatus = useMemo(
    () => groupOrdersByStatus(orders),
    [orders],
  );

  return {
    ...queryResult,
    orders,
    ordersByStatus,
  };
}
