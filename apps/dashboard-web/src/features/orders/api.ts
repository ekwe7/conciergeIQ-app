import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import type { Order, OrderStatus, Payment, PaymentMethod } from '../../lib/api-types';
import { queryKeys } from '../../lib/query-keys';
import { useCurrentUser } from '../auth/AuthProvider';

/** Orders from the last 24 hours (the API's default window), newest first. */
export function useOrders() {
  const { hotelId } = useCurrentUser();
  return useQuery({
    queryKey: queryKeys.orders(hotelId),
    queryFn: ({ signal }) => api.get<Order[]>('/orders', { signal }),
    // Live updates arrive over the WebSocket; this is only a safety net.
    refetchInterval: 60_000,
  });
}

export function useOrder(orderId: string | null) {
  const { hotelId } = useCurrentUser();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.order(hotelId, orderId ?? ''),
    queryFn: ({ signal }) => api.get<Order>(`/orders/${orderId}`, { signal }),
    enabled: Boolean(orderId),
    // Show the board's copy at once while the full record loads.
    initialData: () => queryClient.getQueryData<Order[]>(queryKeys.orders(hotelId))?.find((order) => order.id === orderId),
    initialDataUpdatedAt: () => queryClient.getQueryState(queryKeys.orders(hotelId))?.dataUpdatedAt,
  });
}

/** Puts a fresh order into both the list and its detail cache. */
function useStoreOrder() {
  const { hotelId } = useCurrentUser();
  const queryClient = useQueryClient();
  return (order: Order) => {
    queryClient.setQueryData<Order[]>(queryKeys.orders(hotelId), (orders) =>
      orders?.map((existing) => (existing.id === order.id ? order : existing)),
    );
    queryClient.setQueryData(queryKeys.order(hotelId, order.id), order);
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
    onSuccess: (order) => {
      storeOrder(order);
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments(hotelId) });
    },
    // A conflict means someone else moved the order first: show the latest state.
    onError: () => void queryClient.invalidateQueries({ queryKey: queryKeys.orders(hotelId) }),
  });
}

export function useRecordPayment() {
  const { hotelId } = useCurrentUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, method, reference }: { orderId: string; method: PaymentMethod; reference?: string }) =>
      api.post<Payment>(`/orders/${orderId}/payments`, { method, reference: reference || undefined }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders(hotelId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments(hotelId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stays(hotelId) });
    },
  });
}

/** Whether the API will accept a payment for this order (payments/domain/payment-policy.ts). */
export function canBePaid(order: Pick<Order, 'status' | 'payment' | 'totalAmount'>): boolean {
  return (order.status === 'IN_PROGRESS' || order.status === 'DELIVERED') && !order.payment && order.totalAmount > 0;
}

/** Average time from placing to accepting, over orders that have been accepted. */
export function averageAcceptMilliseconds(orders: Order[]): number | null {
  const durations = orders.flatMap((order) => {
    const accepted = order.history.find((change) => change.to === 'IN_PROGRESS');
    return accepted ? [new Date(accepted.changedAt).getTime() - new Date(order.createdAt).getTime()] : [];
  });
  if (durations.length === 0) return null;
  return durations.reduce((sum, value) => sum + value, 0) / durations.length;
}
