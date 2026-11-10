import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { type ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  HOTEL_ORDERS_POLLING_INTERVAL_MS,
  groupOrdersByStatus,
  useHotelOrders,
} from '../src/features/orders/useHotelOrders';
import { OrderStatus, type Order } from '../src/lib/api-types';
import { order } from './support';

const ordersEndpointPattern = /\/api\/v1\/orders$/;
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

describe('useHotelOrders hook with MSW', () => {
  it('configures a 15-second polling fallback interval constant', () => {
    expect(HOTEL_ORDERS_POLLING_INTERVAL_MS).toBe(15_000);
  });

  it('fetches orders from GET /api/v1/orders and groups them into the four status columns', async () => {
    const sampleOrders: Order[] = [
      order({
        id: 'order-pending-older',
        number: 1001,
        roomNumber: '101',
        status: OrderStatus.PENDING,
        createdAt: '2026-11-09T10:00:00.000Z',
        updatedAt: '2026-11-09T10:00:00.000Z',
      }),
      order({
        id: 'order-pending-newer',
        number: 1002,
        roomNumber: '102',
        status: OrderStatus.PENDING,
        createdAt: '2026-11-09T10:05:00.000Z',
        updatedAt: '2026-11-09T10:05:00.000Z',
      }),
      order({
        id: 'order-in-progress',
        number: 1003,
        roomNumber: '204',
        status: OrderStatus.IN_PROGRESS,
        createdAt: '2026-11-09T09:50:00.000Z',
        updatedAt: '2026-11-09T09:55:00.000Z',
      }),
      order({
        id: 'order-delivered',
        number: 1004,
        roomNumber: '305',
        status: OrderStatus.DELIVERED,
        createdAt: '2026-11-09T09:10:00.000Z',
        updatedAt: '2026-11-09T09:40:00.000Z',
      }),
      order({
        id: 'order-cancelled',
        number: 1005,
        roomNumber: '410',
        status: OrderStatus.CANCELLED,
        cancelReason: 'Guest changed their mind',
        createdAt: '2026-11-09T09:00:00.000Z',
        updatedAt: '2026-11-09T09:05:00.000Z',
      }),
    ];

    mockServer.use(
      http.get(ordersEndpointPattern, () => {
        return HttpResponse.json(sampleOrders);
      }),
    );

    const queryClient = createIsolatedQueryClient();
    const { result } = renderHook(() => useHotelOrders('hotel-msw-1'), {
      wrapper: createQueryWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.orders).toHaveLength(5);
    expect(result.current.ordersByStatus.PENDING.map((orderRecord) => orderRecord.id)).toEqual([
      'order-pending-older',
      'order-pending-newer',
    ]);
    expect(result.current.ordersByStatus.IN_PROGRESS.map((orderRecord) => orderRecord.id)).toEqual([
      'order-in-progress',
    ]);
    expect(result.current.ordersByStatus.DELIVERED.map((orderRecord) => orderRecord.id)).toEqual([
      'order-delivered',
    ]);
    expect(result.current.ordersByStatus.CANCELLED.map((orderRecord) => orderRecord.id)).toEqual([
      'order-cancelled',
    ]);
  });

  it('supports envelope { orders: [...] } responses from GET /api/v1/orders', async () => {
    const sampleOrder = order({
      id: 'order-envelope-1',
      number: 1099,
      roomNumber: '501',
      status: OrderStatus.PENDING,
    });

    mockServer.use(
      http.get(ordersEndpointPattern, () => {
        return HttpResponse.json({ orders: [sampleOrder] });
      }),
    );

    const queryClient = createIsolatedQueryClient();
    const { result } = renderHook(() => useHotelOrders('hotel-msw-2'), {
      wrapper: createQueryWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(1);
    });

    expect(result.current.orders[0]?.id).toBe('order-envelope-1');
  });

  it('surfaces an error state when GET /api/v1/orders returns a server failure', async () => {
    mockServer.use(
      http.get(ordersEndpointPattern, () => {
        return HttpResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'Database unavailable' } },
          { status: 500 },
        );
      }),
    );

    const queryClient = createIsolatedQueryClient();
    const { result } = renderHook(() => useHotelOrders('hotel-msw-error'), {
      wrapper: createQueryWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.orders).toEqual([]);
  });

  it('sorts active columns oldest-first and completed/cancelled columns newest-first', () => {
    const unsortedOrders: Order[] = [
      order({
        id: 'pending-late',
        status: OrderStatus.PENDING,
        createdAt: '2026-11-09T12:10:00.000Z',
      }),
      order({
        id: 'pending-early',
        status: OrderStatus.PENDING,
        createdAt: '2026-11-09T12:01:00.000Z',
      }),
      order({
        id: 'delivered-early',
        status: OrderStatus.DELIVERED,
        updatedAt: '2026-11-09T11:00:00.000Z',
      }),
      order({
        id: 'delivered-late',
        status: OrderStatus.DELIVERED,
        updatedAt: '2026-11-09T11:45:00.000Z',
      }),
    ];

    const grouped = groupOrdersByStatus(unsortedOrders);
    expect(grouped.PENDING.map((orderRecord) => orderRecord.id)).toEqual([
      'pending-early',
      'pending-late',
    ]);
    expect(grouped.DELIVERED.map((orderRecord) => orderRecord.id)).toEqual([
      'delivered-late',
      'delivered-early',
    ]);
  });
});
