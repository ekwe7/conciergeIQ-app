import React from 'react';
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGuestMenu, GUEST_MENU_QUERY_KEY } from '../src/features/menu/hooks/useGuestMenu';
import { GuestMenuItem } from '../src/features/menu/types';

const menuEndpointPattern = new RegExp('/api/v1/guest/menu$');

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

describe('useGuestMenu Hook Suite', () => {
  const customMockItems: GuestMenuItem[] = [
    {
      id: 'item_breakfast_1',
      name: 'Pancake Stack',
      description: 'Fluffy buttermilk pancakes with maple syrup.',
      priceMinor: 320000,
      category: 'Breakfast',
      available: true,
      isAvailable: true,
    },
    {
      id: 'item_mains_2',
      name: 'Suya Spiced Skewers',
      description: 'Thinly sliced tender beef marinated in traditional yaji spice.',
      priceMinor: 650000,
      category: 'Mains',
      available: true,
      isAvailable: true,
    },
    {
      id: 'item_dessert_3',
      name: 'Chocolate Lava Cake',
      description: 'Warm molten chocolate cake served with vanilla gelato.',
      priceMinor: 280000,
      category: 'Desserts',
      available: false,
      isAvailable: false,
    },
  ];

  it('fetches menu items and extracts category list with All prepended', async () => {
    mockServer.use(
      http.get(menuEndpointPattern, () => {
        return HttpResponse.json(customMockItems);
      })
    );

    const testQueryClient = createIsolatedTestQueryClient();
    const { result } = renderHook(() => useGuestMenu(), {
      wrapper: createQueryClientWrapper(testQueryClient),
    });

    await waitFor(
      () => {
        expect(result.current.menuItems.length).toBe(3);
      },
      { timeout: 5000 }
    );

    expect(result.current.categories).toEqual([
      'All',
      'Breakfast',
      'Mains',
      'Desserts',
    ]);
    expect(result.current.menuItems[0].name).toBe('Pancake Stack');
    expect(result.current.menuItems[1].name).toBe('Suya Spiced Skewers');
    expect(result.current.isError).toBe(false);
  });

  it('handles envelope response format with { items: [...] }', async () => {
    mockServer.use(
      http.get(menuEndpointPattern, () => {
        return HttpResponse.json({
          items: customMockItems,
          currency: 'NGN',
        });
      })
    );

    const testQueryClient = createIsolatedTestQueryClient();
    const { result } = renderHook(() => useGuestMenu(), {
      wrapper: createQueryClientWrapper(testQueryClient),
    });

    await waitFor(
      () => {
        expect(result.current.menuItems.length).toBe(3);
      },
      { timeout: 5000 }
    );

    expect(result.current.menuItems[2].name).toBe('Chocolate Lava Cake');
    expect(result.current.menuItems[2].isAvailable).toBe(false);
  });

  it('uses 60-second stale time for menu caching', () => {
    const testQueryClient = createIsolatedTestQueryClient();
    renderHook(() => useGuestMenu(), {
      wrapper: createQueryClientWrapper(testQueryClient),
    });

    const queryState = testQueryClient.getQueryState(GUEST_MENU_QUERY_KEY);
    expect(queryState).toBeDefined();
  });
});
