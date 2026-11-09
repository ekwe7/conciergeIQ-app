import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import type { Order, OrderStatus, Payment, PaymentMethod } from '../../lib/api-types';
import { queryKeys } from '../../lib/query-keys';
import { useCurrentUser } from '../auth/AuthProvider';
import {
  HOTEL_ORDERS_POLLING_INTERVAL_MS,
  ORDER_BOARD_COLUMNS,
  groupOrdersByStatus,
  sortOrdersForColumn,
  useHotelOrders,
} from './useHotelOrders';

export {
  HOTEL_ORDERS_POLLING_INTERVAL_MS,
  ORDER_BOARD_COLUMNS,
  groupOrdersByStatus,
  sortOrdersForColumn,
  useHotelOrders,
};

/** Orders from the last 24 hours (the API's default window), with 15-second polling fallback. */
export function useOrders() {
  return useHotelOrders();
}

export function useOrder(orderId: string | null) {
  const { hotelId } = useCurrentUser();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.order(hotelId, orderId ?? ''),
    queryFn: ({ signal }) => api.get<Order>(`/orders/${orderId}`, { signal }),
    enabled: Boolean(orderId),
    // Show the board's copy at once while the full record loads.
    initialData: () =>
      queryClient
        .getQueryData<Order[]>(queryKeys.orders(hotelId))
        ?.find((orderRecord) => orderRecord.id === orderId),
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(queryKeys.orders(hotelId))?.dataUpdatedAt,
  });
}

/** Puts a fresh order into both the list and its detail cache. */
function useStoreOrder() {
  const { hotelId } = useCurrentUser();
  const queryClient = useQueryClient();
  return (updatedOrder: Order) => {
    queryClient.setQueryData<Order[]>(queryKeys.orders(hotelId), (existingOrders) =>
      existingOrders?.map((existingOrder) =>
        existingOrder.id === updatedOrder.id ? updatedOrder : existingOrder,
      ),
    );
    queryClient.setQueryData(queryKeys.order(hotelId, updatedOrder.id), updatedOrder);
  };
}

export type StatusChange =
  | { status: Extract<OrderStatus, 'IN_PROGRESS' | 'DELIVERED'> }
  | { status: 'CANCELLED'; reason: string };

export function useUpdateOrderStatus() {
  const { hotelId } = useCurrentUser();
  const queryClient = useQueryClient();
  const storeOrder = useStoreOrder();
  return useMutation({
    mutationFn: ({ orderId, change }: { orderId: string; change: StatusChange }) =>
      api.patch<Order>(`/orders/${orderId}/status`, change),
    onSuccess: (updatedOrder) => {
      storeOrder(updatedOrder);
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments(hotelId) });
    },
    // A conflict means someone else moved the order first: show the latest state.
    onError: () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders(hotelId) }),
  });
}

export function useRecordPayment() {
  const { hotelId } = useCurrentUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      method,
      reference,
    }: {
      orderId: string;
      method: PaymentMethod;
      reference?: string;
    }) =>
      api.post<Payment>(`/orders/${orderId}/payments`, {
        method,
        reference: reference || undefined,
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders(hotelId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments(hotelId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stays(hotelId) });
    },
  });
}

/** Whether the API will accept a payment for this order (payments/domain/payment-policy.ts). */
export function canBePaid(
  orderRecord: Pick<Order, 'status' | 'payment' | 'totalAmount'>,
): boolean {
  return (
    (orderRecord.status === 'IN_PROGRESS' || orderRecord.status === 'DELIVERED') &&
    !orderRecord.payment &&
    orderRecord.totalAmount > 0
  );
}

/** Average time from placing to accepting, over orders that have been accepted. */
export function averageAcceptMilliseconds(ordersList: Order[]): number | null {
  const acceptDurations = ordersList.flatMap((orderRecord) => {
    const acceptedTransition = orderRecord.history.find(
      (statusChange) => statusChange.to === 'IN_PROGRESS',
    );
    return acceptedTransition
      ? [
          new Date(acceptedTransition.changedAt).getTime() -
            new Date(orderRecord.createdAt).getTime(),
        ]
      : [];
  });
  if (acceptDurations.length === 0) return null;
  const totalAcceptDuration = acceptDurations.reduce(
    (runningSum, durationMilliseconds) => runningSum + durationMilliseconds,
    0,
  );
  return totalAcceptDuration / acceptDurations.length;
}
