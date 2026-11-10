import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import type { Order, Payment, PaymentMethod } from '../../lib/api-types';
import { queryKeys } from '../../lib/query-keys';
import { useCurrentUser } from '../auth/AuthProvider';
import {
  useStaffWebSocket,
  type UseStaffWebSocketOptions,
  type UseStaffWebSocketResult,
} from './hooks/useStaffWebSocket';
import {
  HOTEL_ORDERS_POLLING_INTERVAL_MS,
  ORDER_BOARD_COLUMNS,
  groupOrdersByStatus,
  sortOrdersForColumn,
  useHotelOrders,
} from './useHotelOrders';
import { useOrderDetail } from './useOrderDetail';
import {
  UpdateOrderStatusSchema,
  useUpdateOrderStatus,
  validateOrderStatusUpdate,
  type OptimisticOrderStatusContext,
  type OrderStatusValidationResult,
  type StatusChange,
  type UpdateOrderStatusPayload,
  type UpdateOrderStatusVariables,
} from './useUpdateOrderStatus';

export {
  HOTEL_ORDERS_POLLING_INTERVAL_MS,
  ORDER_BOARD_COLUMNS,
  UpdateOrderStatusSchema,
  groupOrdersByStatus,
  sortOrdersForColumn,
  useHotelOrders,
  useOrderDetail,
  useStaffWebSocket,
  useUpdateOrderStatus,
  validateOrderStatusUpdate,
  type OptimisticOrderStatusContext,
  type OrderStatusValidationResult,
  type StatusChange,
  type UpdateOrderStatusPayload,
  type UpdateOrderStatusVariables,
  type UseStaffWebSocketOptions,
  type UseStaffWebSocketResult,
};

/** Orders from the last 24 hours (the API's default window), with 15-second polling fallback. */
export function useOrders() {
  return useHotelOrders();
}

/** Alias for `useOrderDetail` querying `GET /api/v1/orders/:orderId`. */
export function useOrder(
  orderId: string | null | undefined,
  hotelIdOverride?: string,
) {
  return useOrderDetail(orderId, hotelIdOverride);
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
