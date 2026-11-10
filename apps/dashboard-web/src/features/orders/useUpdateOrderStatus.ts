import {
  UpdateOrderStatusSchema,
  Value,
  type UpdateOrderStatusPayload,
} from '@conciergeiq/contracts';
import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import type { Order, OrderStatus } from '../../lib/api-types';
import { queryKeys } from '../../lib/query-keys';
import { useCurrentUser } from '../auth/AuthProvider';

export { UpdateOrderStatusSchema, type UpdateOrderStatusPayload };

export type StatusChange =
  | { status: Extract<OrderStatus, 'IN_PROGRESS' | 'DELIVERED'>; reason?: string }
  | { status: 'CANCELLED'; reason: string };

export type UpdateOrderStatusVariables =
  | {
      orderId: string;
      change: StatusChange;
    }
  | {
      orderId: string;
      status: Extract<OrderStatus, 'IN_PROGRESS' | 'DELIVERED'>;
      reason?: string;
    }
  | {
      orderId: string;
      status: 'CANCELLED';
      reason: string;
    };

export interface OptimisticOrderStatusContext {
  orderId: string;
  previousOrdersList: Order[] | undefined;
  previousOrderDetail: Order | undefined;
}

export type OrderStatusValidationResult =
  | { isValid: true; payload: StatusChange }
  | { isValid: false; errorMessage: string };

function useSafeHotelId(explicitHotelId?: string): string {
  try {
    const currentUser = useCurrentUser();
    return explicitHotelId ?? currentUser.hotelId;
  } catch {
    return explicitHotelId ?? 'default-hotel';
  }
}

function normalizeMutationVariables(
  mutationVariables: UpdateOrderStatusVariables,
): { orderId: string; status: OrderStatus; reason?: string } {
  if ('change' in mutationVariables) {
    const changePayload = mutationVariables.change;
    return {
      orderId: mutationVariables.orderId,
      status: changePayload.status,
      reason: 'reason' in changePayload ? changePayload.reason : undefined,
    };
  }

  return {
    orderId: mutationVariables.orderId,
    status: mutationVariables.status,
    reason: 'reason' in mutationVariables ? mutationVariables.reason : undefined,
  };
}

/**
 * Validates an order status update payload against `UpdateOrderStatusSchema`.
 * Enforces a mandatory non-empty `reason` string when `status` is `'CANCELLED'`.
 */
export function validateOrderStatusUpdate(inputPayload: {
  status: OrderStatus;
  reason?: string;
}): OrderStatusValidationResult {
  const trimmedReason = inputPayload.reason?.trim() ?? '';

  if (inputPayload.status === 'CANCELLED') {
    const candidatePayload = {
      status: 'CANCELLED' as const,
      reason: trimmedReason,
    };
    if (!Value.Check(UpdateOrderStatusSchema, candidatePayload)) {
      return {
        isValid: false,
        errorMessage: 'A cancellation reason is required.',
      };
    }
    return {
      isValid: true,
      payload: candidatePayload,
    };
  }

  if (
    inputPayload.status === 'IN_PROGRESS' ||
    inputPayload.status === 'DELIVERED'
  ) {
    const candidatePayload: StatusChange = trimmedReason
      ? { status: inputPayload.status, reason: trimmedReason }
      : { status: inputPayload.status };
    if (!Value.Check(UpdateOrderStatusSchema, candidatePayload)) {
      return {
        isValid: false,
        errorMessage: 'Invalid order status transition payload.',
      };
    }
    return {
      isValid: true,
      payload: candidatePayload,
    };
  }

  return {
    isValid: false,
    errorMessage: `Unsupported status transition to ${inputPayload.status}.`,
  };
}

function applyOptimisticTransitionToOrder(
  existingOrder: Order,
  nextStatus: OrderStatus,
  cancellationReason?: string,
): Order {
  const optimisticTimestampIso = new Date().toISOString();
  const trimmedCancellationReason = cancellationReason?.trim() || null;

  return {
    ...existingOrder,
    status: nextStatus,
    cancelReason:
      nextStatus === 'CANCELLED'
        ? trimmedCancellationReason
        : existingOrder.cancelReason,
    updatedAt: optimisticTimestampIso,
  };
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
 * Dispatches `PATCH /api/v1/orders/:orderId/status` with optimistic updates
 * on both the live orders board cache and the individual order detail cache,
 * rolling back automatically if the server rejects the transition.
 */
export function useUpdateOrderStatus(
  hotelIdOverride?: string,
): UseMutationResult<
  Order,
  Error,
  UpdateOrderStatusVariables,
  OptimisticOrderStatusContext
> {
  const activeHotelId = useSafeHotelId(hotelIdOverride);
  const queryClient = useQueryClient();

  const storeAuthoritativeOrder = (authoritativeOrder: Order) => {
    queryClient.setQueryData<Order[]>(
      queryKeys.orders(activeHotelId),
      (existingOrders) =>
        existingOrders?.map((existingOrder) =>
          existingOrder.id === authoritativeOrder.id
            ? authoritativeOrder
            : existingOrder,
        ),
    );
    queryClient.setQueryData<Order>(
      queryKeys.order(activeHotelId, authoritativeOrder.id),
      authoritativeOrder,
    );
  };

  return useMutation<
    Order,
    Error,
    UpdateOrderStatusVariables,
    OptimisticOrderStatusContext
  >({
    mutationFn: async (mutationVariables) => {
      const normalizedVariables = normalizeMutationVariables(mutationVariables);
      const validationResult = validateOrderStatusUpdate({
        status: normalizedVariables.status,
        reason: normalizedVariables.reason,
      });

      if (!validationResult.isValid) {
        throw new Error(validationResult.errorMessage);
      }

      const responsePayload = await api.patch<Order | { order: Order }>(
        `/orders/${normalizedVariables.orderId}/status`,
        validationResult.payload,
      );
      return extractOrderFromResponse(responsePayload);
    },
    onMutate: async (mutationVariables) => {
      const normalizedVariables = normalizeMutationVariables(mutationVariables);
      const validationResult = validateOrderStatusUpdate({
        status: normalizedVariables.status,
        reason: normalizedVariables.reason,
      });

      const ordersQueryKey = queryKeys.orders(activeHotelId);
      const orderDetailQueryKey = queryKeys.order(
        activeHotelId,
        normalizedVariables.orderId,
      );

      await queryClient.cancelQueries({ queryKey: ordersQueryKey });
      await queryClient.cancelQueries({ queryKey: orderDetailQueryKey });

      const previousOrdersList =
        queryClient.getQueryData<Order[]>(ordersQueryKey);
      const previousOrderDetail =
        queryClient.getQueryData<Order>(orderDetailQueryKey);

      if (validationResult.isValid) {
        if (previousOrdersList) {
          queryClient.setQueryData<Order[]>(
            ordersQueryKey,
            previousOrdersList.map((existingOrder) =>
              existingOrder.id === normalizedVariables.orderId
                ? applyOptimisticTransitionToOrder(
                    existingOrder,
                    normalizedVariables.status,
                    normalizedVariables.reason,
                  )
                : existingOrder,
            ),
          );
        }

        const baseOrderDetail =
          previousOrderDetail ??
          previousOrdersList?.find(
            (existingOrder) => existingOrder.id === normalizedVariables.orderId,
          );

        if (baseOrderDetail) {
          queryClient.setQueryData<Order>(
            orderDetailQueryKey,
            applyOptimisticTransitionToOrder(
              baseOrderDetail,
              normalizedVariables.status,
              normalizedVariables.reason,
            ),
          );
        }
      }

      return {
        orderId: normalizedVariables.orderId,
        previousOrdersList,
        previousOrderDetail,
      };
    },
    onSuccess: (updatedOrder) => {
      storeAuthoritativeOrder(updatedOrder);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payments(activeHotelId),
      });
    },
    onError: (_mutationError, mutationVariables, mutationContext) => {
      const normalizedVariables = normalizeMutationVariables(mutationVariables);
      const targetOrderId =
        mutationContext?.orderId ?? normalizedVariables.orderId;

      if (mutationContext?.previousOrdersList !== undefined) {
        queryClient.setQueryData<Order[]>(
          queryKeys.orders(activeHotelId),
          mutationContext.previousOrdersList,
        );
      }
      if (mutationContext?.previousOrderDetail !== undefined) {
        queryClient.setQueryData<Order>(
          queryKeys.order(activeHotelId, targetOrderId),
          mutationContext.previousOrderDetail,
        );
      }

      void queryClient.invalidateQueries({
        queryKey: queryKeys.orders(activeHotelId),
      });
    },
  });
}
