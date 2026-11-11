/**
 * useSetAvailability & useStaffMenu — Unit tests for optimistic updates, rollback, and cache management.
 *
 * Verifies:
 *   1. useStaffMenu fetches GET /menu and sorts categories by sortOrder ascending, then name.
 *   2. useSetAvailability optimistically updates query cache before network request completes.
 *   3. useSetAvailability rolls back to previous snapshot if the network request fails with an error.
 *   4. useSetAvailability invalidates the menu query on settlement so server state remains authoritative.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSetAvailability, useStaffMenu } from '../src/features/menu/api';
import type { MenuCategory, MenuItem } from '../src/lib/api-types';
import { queryKeys } from '../src/lib/query-keys';
import { session } from '../src/lib/session';
import { fakeApi, reply, signedInHandlers } from './support';

function createMenuItemFixture(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'item-101',
    categoryId: 'category-mains',
    name: 'Grilled Salmon',
    description: 'Fresh Atlantic salmon with herbs',
    price: 12500,
    isAvailable: true,
    isFeatured: false,
    pairsWith: [],
    sortOrder: 1,
    translations: {},
    ...overrides,
  };
}

function createCategoryFixture(
  overrides: Partial<MenuCategory> = {},
): MenuCategory {
  return {
    id: 'category-mains',
    hotelId: 'hotel-1',
    name: 'Mains',
    sortOrder: 1,
    availableFrom: null,
    availableUntil: null,
    isOpenNow: true,
    translations: {},
    items: [createMenuItemFixture()],
    ...overrides,
  };
}

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

describe('useStaffMenu and useSetAvailability Hooks Suite', () => {
  beforeEach(() => {
    session.store({
      accessToken: 'access-token-test',
      refreshToken: 'refresh-token-test',
    });
  });

  describe('useStaffMenu', () => {
    it('fetches menu categories and sorts them by sortOrder ascending, then name', async () => {
      const unsortedCategories: MenuCategory[] = [
        createCategoryFixture({
          id: 'category-desserts',
          name: 'Desserts',
          sortOrder: 3,
        }),
        createCategoryFixture({
          id: 'category-beverages',
          name: 'Beverages',
          sortOrder: 1,
        }),
        createCategoryFixture({
          id: 'category-appetizers',
          name: 'Appetizers',
          sortOrder: 1,
        }),
      ];

      fakeApi({
        ...signedInHandlers('MANAGER'),
        'GET /menu': () => ({ categories: unsortedCategories }),
      });

      const isolatedQueryClient = createIsolatedQueryClient();
      const { result } = renderHook(() => useStaffMenu(), {
        wrapper: createQueryWrapper(isolatedQueryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const sortedResultCategories = result.current.data ?? [];
      expect(sortedResultCategories).toHaveLength(3);
      // Appetizers and Beverages both have sortOrder 1, so Appetizers comes first alphabetically
      expect(sortedResultCategories[0].name).toBe('Appetizers');
      expect(sortedResultCategories[1].name).toBe('Beverages');
      expect(sortedResultCategories[2].name).toBe('Desserts');
    });
  });

  describe('useSetAvailability optimistic updates and rollback', () => {
    it('optimistically updates cache before the server mutation resolves', async () => {
      const initialItem = createMenuItemFixture({
        id: 'item-101',
        name: 'Grilled Salmon',
        isAvailable: true,
      });
      const initialCategory = createCategoryFixture({
        id: 'category-mains',
        items: [initialItem],
      });

      let serverPatchResolveCallback: ((value: MenuItem) => void) | null = null;
      const serverPatchPromise = new Promise<MenuItem>((resolve) => {
        serverPatchResolveCallback = resolve;
      });

      fakeApi({
        ...signedInHandlers('MANAGER'),
        'PATCH /menu/items/item-101/availability': () => serverPatchPromise,
      });

      const isolatedQueryClient = createIsolatedQueryClient();
      const defaultHotelMenuKey = queryKeys.menu('default-hotel-identifier');

      // Pre-seed query cache with initial category and available item
      isolatedQueryClient.setQueryData(defaultHotelMenuKey, [initialCategory]);

      const { result } = renderHook(() => useSetAvailability(), {
        wrapper: createQueryWrapper(isolatedQueryClient),
      });

      // Trigger optimistic mutation to mark item unavailable (86'd)
      act(() => {
        result.current.mutate({
          itemId: 'item-101',
          isAvailable: false,
        });
      });

      // Wait for optimistic cache update before server response resolves
      await waitFor(() => {
        const cachedCategoriesOptimistic =
          isolatedQueryClient.getQueryData<MenuCategory[]>(defaultHotelMenuKey);
        const targetOptimisticItem = cachedCategoriesOptimistic?.[0].items.find(
          (candidateItem) => candidateItem.id === 'item-101',
        );
        expect(targetOptimisticItem?.isAvailable).toBe(false);
      });

      // Now resolve the server patch
      act(() => {
        serverPatchResolveCallback?.({
          ...initialItem,
          isAvailable: false,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('rolls back optimistic cache update when server returns an error', async () => {
      const initialItem = createMenuItemFixture({
        id: 'item-202',
        name: 'Ribeye Steak',
        isAvailable: true,
      });
      const initialCategory = createCategoryFixture({
        id: 'category-mains',
        items: [initialItem],
      });

      fakeApi({
        ...signedInHandlers('MANAGER'),
        'PATCH /menu/items/item-202/availability': () =>
          reply(500, { message: 'Database connection failure' }),
      });

      const isolatedQueryClient = createIsolatedQueryClient();
      const defaultHotelMenuKey = queryKeys.menu('default-hotel-identifier');

      // Pre-seed cache with available item
      isolatedQueryClient.setQueryData(defaultHotelMenuKey, [initialCategory]);

      const { result } = renderHook(() => useSetAvailability(), {
        wrapper: createQueryWrapper(isolatedQueryClient),
      });

      // Trigger mutation that will fail
      act(() => {
        result.current.mutate({
          itemId: 'item-202',
          isAvailable: false,
        });
      });

      // Wait for mutation to fail and roll back
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Cache should be rolled back to original isAvailable: true
      const rolledBackCategories =
        isolatedQueryClient.getQueryData<MenuCategory[]>(defaultHotelMenuKey);
      expect(rolledBackCategories).toBeDefined();
      const rolledBackItem = rolledBackCategories?.[0].items.find(
        (candidateItem) => candidateItem.id === 'item-202',
      );
      expect(rolledBackItem?.isAvailable).toBe(true);
    });

    it('invalidates menu query key on settlement', async () => {
      const initialItem = createMenuItemFixture({
        id: 'item-303',
        isAvailable: false,
      });
      const initialCategory = createCategoryFixture({
        id: 'category-mains',
        items: [initialItem],
      });

      fakeApi({
        ...signedInHandlers('MANAGER'),
        'PATCH /menu/items/item-303/availability': () => ({
          ...initialItem,
          isAvailable: true,
        }),
      });

      const isolatedQueryClient = createIsolatedQueryClient();
      const defaultHotelMenuKey = queryKeys.menu('default-hotel-identifier');
      isolatedQueryClient.setQueryData(defaultHotelMenuKey, [initialCategory]);

      const invalidateQueriesSpy = vi.spyOn(
        isolatedQueryClient,
        'invalidateQueries',
      );

      const { result } = renderHook(() => useSetAvailability(), {
        wrapper: createQueryWrapper(isolatedQueryClient),
      });

      act(() => {
        result.current.mutate({
          itemId: 'item-303',
          isAvailable: true,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: defaultHotelMenuKey,
      });
    });
  });
});
