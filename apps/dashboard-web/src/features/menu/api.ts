import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import type { MenuCategory, MenuItem } from '../../lib/api-types';
import { queryKeys } from '../../lib/query-keys';
import { useCurrentUser } from '../auth/AuthProvider';

export function useMenu() {
  const { hotelId } = useCurrentUser();
  return useQuery({
    queryKey: queryKeys.menu(hotelId),
    queryFn: async ({ signal }) => {
      const { categories } = await api.get<{ categories: MenuCategory[] }>('/menu', { signal });
      return [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    },
  });
}

function useMenuMutation<Variables, Result>(send: (variables: Variables) => Promise<Result>) {
  const { hotelId } = useCurrentUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.menu(hotelId) }),
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
    itemId ? api.patch<MenuItem>(`/menu/items/${itemId}`, input) : api.post<MenuItem>('/menu/items', input),
  );

export const useDeleteItem = () => useMenuMutation((itemId: string) => api.delete<void>(`/menu/items/${itemId}`));

export const useSaveCategory = () =>
  useMenuMutation(({ categoryId, sortOrder, ...fields }: CategoryInput) =>
    categoryId
      ? api.patch<MenuCategory>(`/menu/categories/${categoryId}`, fields)
      : api.post<MenuCategory>('/menu/categories', { ...fields, sortOrder }),
  );

export const useDeleteCategory = () =>
  useMenuMutation((categoryId: string) => api.delete<void>(`/menu/categories/${categoryId}`));

/** Optimistic, because staff flip this mid-service and expect it to respond at once. */
export function useSetAvailability() {
  const { hotelId } = useCurrentUser();
  const queryClient = useQueryClient();
  const key = queryKeys.menu(hotelId);
  return useMutation({
    mutationFn: ({ itemId, isAvailable }: { itemId: string; isAvailable: boolean }) =>
      api.patch<MenuItem>(`/menu/items/${itemId}/availability`, { isAvailable }),
    onMutate: async ({ itemId, isAvailable }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MenuCategory[]>(key);
      queryClient.setQueryData<MenuCategory[]>(key, (categories) =>
        categories?.map((category) => ({
          ...category,
          items: category.items.map((item) => (item.id === itemId ? { ...item, isAvailable } : item)),
        })),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: key }),
  });
}
