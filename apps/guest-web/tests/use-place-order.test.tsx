import React from 'react';
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  usePlaceOrder,
  generateCryptographicIdempotencyKey,
  mapCartLinesToOrderPayload,
} from '../src/features/orders';
import { CartLineItem } from '../src/features/cart/types';
import { GuestMenuItem } from '../src/features/menu/types';

const orderEndpointPattern = new RegExp('/api/v1/guest/orders$');

const mockServer = setupServer();

beforeAll(() => {
  mockServer.listen({ onUnhandledRequest: 'bypass' });
});

afterEach(() => {
  mockServer.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  mockServer.close();
});

function createIsolatedTestQueryClient(): QueryClient {
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

function createQueryClientWrapper(queryClient: QueryClient) {
  return function QueryClientWrapper({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('usePlaceOrder Hook & Idempotency Header Suite', () => {
  const sampleDish: GuestMenuItem = {
    id: 'dish_jollof_1',
    name: 'Jollof Rice with Chicken',
    description: 'Smoky party jollof with quarter chicken.',
    priceMinor: 850000,
    category: 'Mains',
    available: true,
  };

  const sampleCartLines: CartLineItem[] = [
    {
      lineIdentifier: 'dish_jollof_1:mild pepper',
      item: sampleDish,
      quantity: 2,
      specialInstructions: 'Mild pepper',
    },
  ];

  it('generates a valid RFC 4122 UUID v4 idempotency key', () => {
    const generatedKey = generateCryptographicIdempotencyKey();
    const uuidV4RegexPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    expect(generatedKey).toBeDefined();
    expect(uuidV4RegexPattern.test(generatedKey)).toBe(true);

    const secondKey = generateCryptographicIdempotencyKey();
    expect(secondKey).not.toBe(generatedKey);
  });

  it('correctly maps cart line items into CreateOrderPayload conforming to schema', () => {
    const mappedOrderPayload = mapCartLinesToOrderPayload(
      '204',
      'stay_sample_4481',
      sampleCartLines
    );

    expect(mappedOrderPayload.roomNumber).toBe('204');
    expect(mappedOrderPayload.stayId).toBe('stay_sample_4481');
    expect(mappedOrderPayload.items.length).toBe(1);
    expect(mappedOrderPayload.items[0]).toEqual({
      itemId: 'dish_jollof_1',
      quantity: 2,
      specialInstructions: 'Mild pepper',
      notes: 'Mild pepper',
    });
  });

  it('submits order with HTTP 201 Created and verifies Idempotency-Key and Authorization headers', async () => {
    let capturedIdempotencyHeader: string | null = null;
    let capturedAuthorizationHeader: string | null = null;
    let capturedRequestBody: unknown = null;

    mockServer.use(
      http.post(orderEndpointPattern, async ({ request }) => {
        capturedIdempotencyHeader = request.headers.get('Idempotency-Key');
        capturedAuthorizationHeader = request.headers.get('Authorization');
        capturedRequestBody = await request.json();

        return HttpResponse.json(
          {
            id: 'ord_SERVER_101',
            roomNumber: '204',
            stayId: 'stay_sample_4481',
            status: 'PENDING',
          },
          { status: 201 }
        );
      })
    );

    const testQueryClient = createIsolatedTestQueryClient();
    const handleSuccessCallback = vi.fn();

    const { result } = renderHook(
      () =>
        usePlaceOrder({
          onSuccessCallback: handleSuccessCallback,
        }),
      {
        wrapper: createQueryClientWrapper(testQueryClient),
      }
    );

    const orderPayload = mapCartLinesToOrderPayload(
      '204',
      'stay_sample_4481',
      sampleCartLines
    );

    result.current.mutate({
      payload: orderPayload,
      sessionToken: 'test_jwt_session_token_xyz',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(handleSuccessCallback).toHaveBeenCalledTimes(1);
    expect(handleSuccessCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ord_SERVER_101',
      })
    );

    // Verify Idempotency-Key header is present and valid UUID v4
    expect(capturedIdempotencyHeader).toBeDefined();
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidPattern.test(capturedIdempotencyHeader!)).toBe(true);

    // Verify Authorization header
    expect(capturedAuthorizationHeader).toBe('Bearer test_jwt_session_token_xyz');

    // Verify request payload shape
    expect(capturedRequestBody).toEqual(orderPayload);
  });

  it('handles backend 409 Conflict (item unavailable) and triggers onError callback', async () => {
    mockServer.use(
      http.post(orderEndpointPattern, () => {
        return HttpResponse.json(
          {
            title: 'Item Unavailable',
            detail: 'Item Wagyu Burger is out of stock',
            status: 409,
          },
          { status: 409 }
        );
      })
    );

    const testQueryClient = createIsolatedTestQueryClient();
    const handleErrorCallback = vi.fn();

    const { result } = renderHook(
      () =>
        usePlaceOrder({
          onErrorCallback: handleErrorCallback,
        }),
      {
        wrapper: createQueryClientWrapper(testQueryClient),
      }
    );

    const orderPayload = mapCartLinesToOrderPayload(
      '204',
      'stay_sample_4481',
      sampleCartLines
    );

    result.current.mutate({
      payload: orderPayload,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(handleErrorCallback).toHaveBeenCalledTimes(1);
    expect(result.current.error?.message).toContain('Item Wagyu Burger is out of stock');
  });

  it('handles backend 400 Bad Request validation error and triggers onError callback', async () => {
    mockServer.use(
      http.post(orderEndpointPattern, () => {
        return HttpResponse.json(
          {
            title: 'Validation Error',
            detail: 'Cart must contain at least one available dish',
            status: 400,
          },
          { status: 400 }
        );
      })
    );

    const testQueryClient = createIsolatedTestQueryClient();
    const handleErrorCallback = vi.fn();

    const { result } = renderHook(
      () =>
        usePlaceOrder({
          onErrorCallback: handleErrorCallback,
        }),
      {
        wrapper: createQueryClientWrapper(testQueryClient),
      }
    );

    result.current.mutate({
      payload: {
        roomNumber: '204',
        stayId: 'stay_sample_4481',
        items: [],
      },
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(handleErrorCallback).toHaveBeenCalledTimes(1);
    expect(result.current.error?.message).toContain('Cart must contain at least one available dish');
  });
});
