import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { QueryClient } from '@tanstack/react-query';
import { useGuestOrderHistory } from '../src/features/orders/hooks/useGuestOrderHistory';
import { clearGuestSession } from '../src/features/guest-session/session-store';
import {
  ACTIVE_STAY_IDENTIFIER,
  GUEST_ORDERS_ENDPOINT_PATTERN,
  OTHER_STAY_IDENTIFIER,
  createOrderFixture,
  createQueryWrapper,
  createTestQueryClient,
  saveActiveGuestSession,
} from './fixtures/stay-fixtures';

const mockServer = setupServer();

beforeAll(() => mockServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  mockServer.resetHandlers();
  clearGuestSession();
});
afterAll(() => mockServer.close());

const breakfastOrder = createOrderFixture({
  identifier: 'ord_breakfast',
  createdAt: '2026-11-04T08:30:00.000Z',
});
const dinnerOrder = createOrderFixture({
  identifier: 'ord_dinner',
  status: 'IN_PROGRESS',
  createdAt: '2026-11-04T19:45:00.000Z',
});
const lunchOrder = createOrderFixture({
  identifier: 'ord_lunch',
  createdAt: '2026-11-04T13:00:00.000Z',
});
const otherStayOrder = createOrderFixture({
  identifier: 'ord_other_stay',
  stayIdentifier: OTHER_STAY_IDENTIFIER,
  createdAt: '2026-11-04T20:00:00.000Z',
});

describe('useGuestOrderHistory', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    saveActiveGuestSession();
  });

  it('returns only orders belonging to the active stay', async () => {
    mockServer.use(
      http.get(GUEST_ORDERS_ENDPOINT_PATTERN, () =>
        HttpResponse.json([breakfastOrder, otherStayOrder, dinnerOrder])
      )
    );

    const { result } = renderHook(() => useGuestOrderHistory(), {
      wrapper: createQueryWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.ordersList.map((orderRecord) => orderRecord.id)).toEqual([
      'ord_dinner',
      'ord_breakfast',
    ]);
    expect(result.current.ordersList.every((orderRecord) => orderRecord.stayId === ACTIVE_STAY_IDENTIFIER)).toBe(true);
  });

  it('sorts orders chronologically, newest first', async () => {
    mockServer.use(
      http.get(GUEST_ORDERS_ENDPOINT_PATTERN, () =>
        HttpResponse.json([breakfastOrder, dinnerOrder, lunchOrder])
      )
    );

    const { result } = renderHook(() => useGuestOrderHistory(), {
      wrapper: createQueryWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.ordersList).toHaveLength(3));
    expect(result.current.ordersList.map((orderRecord) => orderRecord.id)).toEqual([
      'ord_dinner',
      'ord_lunch',
      'ord_breakfast',
    ]);
  });

  it('accepts the { orders: [...] } envelope response shape', async () => {
    mockServer.use(
      http.get(GUEST_ORDERS_ENDPOINT_PATTERN, () => HttpResponse.json({ orders: [lunchOrder] }))
    );

    const { result } = renderHook(() => useGuestOrderHistory(), {
      wrapper: createQueryWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.ordersList).toHaveLength(1));
    expect(result.current.ordersList[0]?.id).toBe('ord_lunch');
  });

  it('exposes an error state when the request fails', async () => {
    mockServer.use(
      http.get(GUEST_ORDERS_ENDPOINT_PATTERN, () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 })
      )
    );

    const { result } = renderHook(() => useGuestOrderHistory(), {
      wrapper: createQueryWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.ordersList).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('does not request orders when there is no active guest session', async () => {
    clearGuestSession();
    let requestCount = 0;
    mockServer.use(
      http.get(GUEST_ORDERS_ENDPOINT_PATTERN, () => {
        requestCount += 1;
        return HttpResponse.json([]);
      })
    );

    const { result } = renderHook(() => useGuestOrderHistory(), {
      wrapper: createQueryWrapper(queryClient),
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.hasActiveSession).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(requestCount).toBe(0);
  });
});
