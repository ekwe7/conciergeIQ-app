import { Value } from '@conciergeiq/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, delay, http } from 'msw';
import { setupServer } from 'msw/node';
import { type ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { useOrderDetail } from '../src/features/orders/useOrderDetail';
import {
  UpdateOrderStatusSchema,
  useUpdateOrderStatus,
  validateOrderStatusUpdate,
} from '../src/features/orders/useUpdateOrderStatus';
import { OrderStatus, type Order } from '../src/lib/api-types';
import { queryKeys } from '../src/lib/query-keys';
import { order } from './support';

const mockServer = setupServer();

beforeAll(() => {
  mockServer.listen({ onUnhandledRequest: 'bypass' });
});

afterEach(() => {
  mockServer.resetHandlers();
});

afterAll(() => {
  mockServer.close();
});

function createIsolatedQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function createQueryWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('UpdateOrderStatusSchema and validateOrderStatusUpdate', () => {
  it('accepts IN_PROGRESS and DELIVERED transitions without a reason', () => {
    expect(
      Value.Check(UpdateOrderStatusSchema, { status: OrderStatus.IN_PROGRESS }),
    ).toBe(true);
    expect(
      Value.Check(UpdateOrderStatusSchema, { status: OrderStatus.DELIVERED }),
    ).toBe(true);

    const acceptValidation = validateOrderStatusUpdate({
      status: OrderStatus.IN_PROGRESS,
    });
    expect(acceptValidation.isValid).toBe(true);
  });

  it('requires a non-empty reason string when status is CANCELLED', () => {
    expect(
      Value.Check(UpdateOrderStatusSchema, {
        status: OrderStatus.CANCELLED,
        reason: '',
      }),
    ).toBe(false);

    const emptyReasonValidation = validateOrderStatusUpdate({
      status: OrderStatus.CANCELLED,
      reason: '   ',
    });
    expect(emptyReasonValidation.isValid).toBe(false);

    const validCancelValidation = validateOrderStatusUpdate({
      status: OrderStatus.CANCELLED,
      reason: '  Item out of stock  ',
    });
    expect(validCancelValidation).toEqual({
      isValid: true,
      payload: {
        status: OrderStatus.CANCELLED,
        reason: 'Item out of stock',
      },
    });
  });
});

describe('useOrderDetail hook', () => {
  it('fetches fresh order details from GET /api/v1/orders/:orderId while seeding from board cache', async () => {
    const testHotelId = 'hotel-detail-test';
    const cachedBoardOrder = order({
      id: 'order-detail-101',
      number: 1042,
      roomNumber: '101',
      status: OrderStatus.PENDING,
    });
    const freshServerOrder = order({
      id: 'order-detail-101',
      number: 1042,
      roomNumber: '101',
      status: OrderStatus.IN_PROGRESS,
      history: [
        {
          from: null,
          to: OrderStatus.PENDING,
          changedBy: 'guest',
          changedAt: cachedBoardOrder.createdAt,
        },
        {
          from: OrderStatus.PENDING,
          to: OrderStatus.IN_PROGRESS,
          changedBy: 'Chidi Eze',
          changedAt: '2026-11-09T19:42:00.000Z',
        },
      ],
    });

    mockServer.use(
      http.get(/\/api\/v1\/orders\/order-detail-101$/, () => {
        return HttpResponse.json(freshServerOrder);
      }),
    );

    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData<Order[]>(queryKeys.orders(testHotelId), [
      cachedBoardOrder,
    ]);

    const { result } = renderHook(
      () => useOrderDetail('order-detail-101', testHotelId),
      { wrapper: createQueryWrapper(queryClient) },
    );

    // Immediately seeded from the live board cache
    expect(result.current.data?.roomNumber).toBe('101');

    // Fresh server response updates the detail record
    await waitFor(() => {
      expect(result.current.data?.status).toBe(OrderStatus.IN_PROGRESS);
    });
    expect(result.current.data?.history).toHaveLength(2);
  });
});

describe('useUpdateOrderStatus mutation hook', () => {
  it('optimistically updates the live board cache and order detail cache when advancing PENDING -> IN_PROGRESS', async () => {
    const testHotelId = 'hotel-mutation-1';
    const initialPendingOrder = order({
      id: 'order-accept-1',
      number: 1047,
      roomNumber: '214',
      status: OrderStatus.PENDING,
    });

    let capturedRequestBody: unknown = null;

    mockServer.use(
      http.patch(/\/api\/v1\/orders\/order-accept-1\/status$/, async ({ request }) => {
        capturedRequestBody = await request.json();
        await delay(80);
        return HttpResponse.json({
          ...initialPendingOrder,
          status: OrderStatus.IN_PROGRESS,
          updatedAt: '2026-11-09T15:05:00.000Z',
        });
      }),
    );

    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData<Order[]>(queryKeys.orders(testHotelId), [
      initialPendingOrder,
    ]);
    queryClient.setQueryData<Order>(
      queryKeys.order(testHotelId, initialPendingOrder.id),
      initialPendingOrder,
    );

    const { result } = renderHook(() => useUpdateOrderStatus(testHotelId), {
      wrapper: createQueryWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        orderId: initialPendingOrder.id,
        change: { status: OrderStatus.IN_PROGRESS },
      });
    });

    // Optimistic cache update happens immediately before server response resolves
    await waitFor(() => {
      const optimisticBoardOrders = queryClient.getQueryData<Order[]>(
        queryKeys.orders(testHotelId),
      );
      expect(optimisticBoardOrders?.[0]?.status).toBe(OrderStatus.IN_PROGRESS);
    });

    const optimisticDetailOrder = queryClient.getQueryData<Order>(
      queryKeys.order(testHotelId, initialPendingOrder.id),
    );
    expect(optimisticDetailOrder?.status).toBe(OrderStatus.IN_PROGRESS);

    // Wait for server response to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(capturedRequestBody).toEqual({ status: OrderStatus.IN_PROGRESS });
    const finalBoardOrders = queryClient.getQueryData<Order[]>(
      queryKeys.orders(testHotelId),
    );
    expect(finalBoardOrders?.[0]?.status).toBe(OrderStatus.IN_PROGRESS);
    expect(finalBoardOrders?.[0]?.updatedAt).toBe('2026-11-09T15:05:00.000Z');
  });

  it('advances an IN_PROGRESS order to DELIVERED and updates caches', async () => {
    const testHotelId = 'hotel-mutation-2';
    const inProgressOrder = order({
      id: 'order-deliver-2',
      number: 1042,
      roomNumber: '101',
      status: OrderStatus.IN_PROGRESS,
    });

    let capturedRequestBody: unknown = null;

    mockServer.use(
      http.patch(/\/api\/v1\/orders\/order-deliver-2\/status$/, async ({ request }) => {
        capturedRequestBody = await request.json();
        return HttpResponse.json({
          ...inProgressOrder,
          status: OrderStatus.DELIVERED,
          updatedAt: '2026-11-09T15:20:00.000Z',
        });
      }),
    );

    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData<Order[]>(queryKeys.orders(testHotelId), [
      inProgressOrder,
    ]);

    const { result } = renderHook(() => useUpdateOrderStatus(testHotelId), {
      wrapper: createQueryWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        orderId: inProgressOrder.id,
        change: { status: OrderStatus.DELIVERED },
      });
    });

    expect(capturedRequestBody).toEqual({ status: OrderStatus.DELIVERED });

    const updatedBoardOrders = queryClient.getQueryData<Order[]>(
      queryKeys.orders(testHotelId),
    );
    expect(updatedBoardOrders?.[0]?.status).toBe(OrderStatus.DELIVERED);
  });

  it('cancels an order with a mandatory reason and updates cancelReason in cache', async () => {
    const testHotelId = 'hotel-mutation-cancel';
    const activeOrder = order({
      id: 'order-cancel-3',
      number: 1055,
      roomNumber: '310',
      status: OrderStatus.PENDING,
    });

    let capturedRequestBody: unknown = null;

    mockServer.use(
      http.patch(/\/api\/v1\/orders\/order-cancel-3\/status$/, async ({ request }) => {
        capturedRequestBody = await request.json();
        return HttpResponse.json({
          ...activeOrder,
          status: OrderStatus.CANCELLED,
          cancelReason: 'Guest changed their mind',
        });
      }),
    );

    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData<Order[]>(queryKeys.orders(testHotelId), [
      activeOrder,
    ]);

    const { result } = renderHook(() => useUpdateOrderStatus(testHotelId), {
      wrapper: createQueryWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        orderId: activeOrder.id,
        change: {
          status: OrderStatus.CANCELLED,
          reason: 'Guest changed their mind',
        },
      });
    });

    expect(capturedRequestBody).toEqual({
      status: OrderStatus.CANCELLED,
      reason: 'Guest changed their mind',
    });

    const updatedBoardOrders = queryClient.getQueryData<Order[]>(
      queryKeys.orders(testHotelId),
    );
    expect(updatedBoardOrders?.[0]?.status).toBe(OrderStatus.CANCELLED);
    expect(updatedBoardOrders?.[0]?.cancelReason).toBe(
      'Guest changed their mind',
    );
  });

  it('blocks cancellation and does not send a network request when reason is empty', async () => {
    const testHotelId = 'hotel-mutation-empty-reason';
    const activeOrder = order({
      id: 'order-cancel-empty',
      number: 1060,
      roomNumber: '402',
      status: OrderStatus.PENDING,
    });

    let networkRequestCount = 0;
    mockServer.use(
      http.patch(/\/api\/v1\/orders\/order-cancel-empty\/status$/, () => {
        networkRequestCount += 1;
        return HttpResponse.json(activeOrder);
      }),
    );

    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData<Order[]>(queryKeys.orders(testHotelId), [
      activeOrder,
    ]);

    const { result } = renderHook(() => useUpdateOrderStatus(testHotelId), {
      wrapper: createQueryWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        orderId: activeOrder.id,
        change: { status: OrderStatus.CANCELLED, reason: '   ' },
      }),
    ).rejects.toThrow(/cancellation reason is required/i);

    expect(networkRequestCount).toBe(0);
    const cachedOrders = queryClient.getQueryData<Order[]>(
      queryKeys.orders(testHotelId),
    );
    expect(cachedOrders?.[0]?.status).toBe(OrderStatus.PENDING);
  });

  it('rolls back optimistic cache updates when the server returns an error', async () => {
    const testHotelId = 'hotel-mutation-rollback';
    const initialOrder = order({
      id: 'order-rollback-1',
      number: 1070,
      roomNumber: '208',
      status: OrderStatus.PENDING,
    });

    mockServer.use(
      http.patch(/\/api\/v1\/orders\/order-rollback-1\/status$/, async () => {
        await delay(50);
        return HttpResponse.json(
          {
            error: {
              code: 'CONFLICT',
              message: 'Order was already updated by another staff member',
            },
          },
          { status: 409 },
        );
      }),
    );

    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData<Order[]>(queryKeys.orders(testHotelId), [
      initialOrder,
    ]);
    queryClient.setQueryData<Order>(
      queryKeys.order(testHotelId, initialOrder.id),
      initialOrder,
    );

    const { result } = renderHook(() => useUpdateOrderStatus(testHotelId), {
      wrapper: createQueryWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        orderId: initialOrder.id,
        change: { status: OrderStatus.IN_PROGRESS },
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const rolledBackBoardOrders = queryClient.getQueryData<Order[]>(
      queryKeys.orders(testHotelId),
    );
    const rolledBackDetailOrder = queryClient.getQueryData<Order>(
      queryKeys.order(testHotelId, initialOrder.id),
    );
    expect(rolledBackBoardOrders?.[0]?.status).toBe(OrderStatus.PENDING);
    expect(rolledBackDetailOrder?.status).toBe(OrderStatus.PENDING);
  });
});
