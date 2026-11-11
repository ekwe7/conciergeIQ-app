import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import type { MenuCategory, MenuItem } from '../../lib/api-types';
import { queryKeys } from '../../lib/query-keys';
import { useCurrentUser } from '../auth/AuthProvider';

/**
 * Safely resolves the current staff user's hotel identifier, falling back gracefully
 * if session restoration is still in flight or during isolated component unit tests.
 */
function useCurrentHotelIdentifier(): string {
  try {
    const currentUser = useCurrentUser();
    return currentUser.hotelId;
  } catch {
    return 'default-hotel-identifier';
  }
}

/**
 * Query the staff menu catalog: categories and their item listings.
 * Sorted by category sortOrder ascending, then category name.
 */
export function useStaffMenu() {
  const currentHotelIdentifier = useCurrentHotelIdentifier();
  return useQuery({
    queryKey: queryKeys.menu(currentHotelIdentifier),
    queryFn: async ({ signal: abortSignal }) => {
      const { categories } = await api.get<{ categories: MenuCategory[] }>('/menu', {
        signal: abortSignal,
      });
      return [...categories].sort(
        (firstCategory, secondCategory) =>
          firstCategory.sortOrder - secondCategory.sortOrder ||
          firstCategory.name.localeCompare(secondCategory.name),
      );
    },
  });
}

/** Backward-compatible alias for useStaffMenu */
export const useMenu = useStaffMenu;

function useMenuMutation<MutationVariables, MutationResult>(
  mutationExecutor: (variables: MutationVariables) => Promise<MutationResult>,
) {
  const currentHotelIdentifier = useCurrentHotelIdentifier();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mutationExecutor,
    onSettled: () =>
      void queryClient.invalidateQueries({
        queryKey: queryKeys.menu(currentHotelIdentifier),
      }),
  });
}

export interface ItemInput {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  isAvailable?: boolean;
  isFeatured?: boolean;
  pairsWith?: string[];
  translations?: MenuItem['translations'];
}

export interface CategoryInput {
  categoryId?: string;
  name: string;
  sortOrder?: number;
  availableFrom: string | null;
  availableUntil: string | null;
  translations: MenuCategory['translations'];
}

export const useSaveItem = () =>
  useMenuMutation(({ itemId, input }: { itemId?: string; input: ItemInput }) =>
    itemId
      ? api.patch<MenuItem>(`/menu/items/${itemId}`, input)
      : api.post<MenuItem>('/menu/items', input),
  );

export const useDeleteItem = () =>
  useMenuMutation((targetItemId: string) =>
    api.delete<void>(`/menu/items/${targetItemId}`),
  );

export const useSaveCategory = () =>
  useMenuMutation(
    ({ categoryId, sortOrder, ...remainingFields }: CategoryInput) =>
      categoryId
        ? api.patch<MenuCategory>(`/menu/categories/${categoryId}`, remainingFields)
        : api.post<MenuCategory>('/menu/categories', {
            ...remainingFields,
            sortOrder,
          }),
  );

export const useDeleteCategory = () =>
  useMenuMutation((targetCategoryId: string) =>
    api.delete<void>(`/menu/categories/${targetCategoryId}`),
  );

export interface SetAvailabilityParameters {
  itemId: string;
  isAvailable: boolean;
}

export interface SetAvailabilityContext {
  previousCategories: MenuCategory[] | undefined;
}

/**
 * Optimistic mutation to toggle item availability (86ing).
 * Staff flip this switch mid-service and expect the user interface to respond instantaneously.
 * If the network request fails, changes roll back immediately to the previous snapshot.
 */
export function useSetAvailability() {
  const currentHotelIdentifier = useCurrentHotelIdentifier();
  const queryClient = useQueryClient();
  const targetMenuQueryKey = queryKeys.menu(currentHotelIdentifier);

  return useMutation<
    MenuItem,
    unknown,
    SetAvailabilityParameters,
    SetAvailabilityContext
  >({
    mutationFn: ({ itemId, isAvailable }: SetAvailabilityParameters) =>
      api.patch<MenuItem>(`/menu/items/${itemId}/availability`, { isAvailable }),

    onMutate: async ({ itemId, isAvailable }: SetAvailabilityParameters) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: targetMenuQueryKey });

      // Snapshot the previous menu categories
      const previousCategories =
        queryClient.getQueryData<MenuCategory[]>(targetMenuQueryKey);

      // Optimistically flip the item availability in the cache
      queryClient.setQueryData<MenuCategory[]>(
        targetMenuQueryKey,
        (existingCategories) => {
          if (!existingCategories) {
            return existingCategories;
          }
          return existingCategories.map((categoryItem) => ({
            ...categoryItem,
            items: categoryItem.items.map((menuItem) =>
              menuItem.id === itemId
                ? { ...menuItem, isAvailable }
                : menuItem,
            ),
          }));
        },
      );

      return { previousCategories };
    },

    onError: (
      _caughtError: unknown,
      _mutationVariables: SetAvailabilityParameters,
      mutationContext: SetAvailabilityContext | undefined,
    ) => {
      // Roll back to previous snapshot on network or server failure
      if (mutationContext?.previousCategories !== undefined) {
        queryClient.setQueryData<MenuCategory[]>(
          targetMenuQueryKey,
          mutationContext.previousCategories,
        );
      }
    },

    onSettled: () => {
      // Always re-sync with server state after mutation finishes
      void queryClient.invalidateQueries({ queryKey: targetMenuQueryKey });
    },
  });
}
