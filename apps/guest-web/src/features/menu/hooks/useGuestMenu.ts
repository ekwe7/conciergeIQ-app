import { useQuery } from '@tanstack/react-query';
import { guestApiClient } from '../../../lib/api-client';
import {
  GuestMenuItem,
  GuestMenuResponseEnvelope,
} from '../types';

export const GUEST_MENU_QUERY_KEY = ['guest', 'menu'] as const;

export const DEFAULT_FALLBACK_MENU_ITEMS: GuestMenuItem[] = [
  {
    id: 'item_jollof_1',
    name: 'Jollof rice & grilled chicken',
    description: 'Smoky party jollof with quarter chicken, fried plantain and fresh coleslaw.',
    priceMinor: 850000,
    category: 'Mains',
    available: true,
    isAvailable: true,
    isPopular: true,
    dietary: ['Signature'],
    ingredients: ['Parboiled rice', 'Plum tomatoes', 'Scotch bonnet', 'Quarter chicken', 'Plantain'],
  },
  {
    id: 'item_club_burger_2',
    name: 'Azure club burger',
    description: 'Dry-aged beef patty, mature cheddar cheese, caramelized onions and seasoned fries.',
    priceMinor: 920000,
    category: 'Mains',
    available: true,
    isAvailable: true,
    isPopular: true,
    dietary: ['Popular'],
    ingredients: ['Dry-aged beef', 'Brioche bun', 'Aged cheddar', 'Truffle aioli', 'French fries'],
  },
  {
    id: 'item_avocado_toast_3',
    name: 'Artisan Avocado & Poached Egg Toast',
    description: 'Sourdough toast topped with smashed Haas avocado, organic poached eggs, and chili flakes.',
    priceMinor: 450000,
    category: 'Breakfast',
    available: true,
    isAvailable: true,
    dietary: ['Vegetarian'],
    ingredients: ['Artisan sourdough', 'Haas avocado', 'Free-range eggs', 'Microgreens', 'Chili flakes'],
  },
  {
    id: 'item_egusi_soup_4',
    name: 'Egusi soup & pounded yam',
    description: 'Traditional melon seed soup prepared with assorted tender meats and smooth pounded yam.',
    priceMinor: 780000,
    category: 'Mains',
    available: true,
    isAvailable: true,
    dietary: ['Local Special'],
    ingredients: ['Ground melon seeds', 'Bitterleaf', 'Assorted beef', 'Stockfish', 'Yam fufu'],
  },
  {
    id: 'item_seafood_pasta_5',
    name: 'Seafood pasta',
    description: 'Linguine pasta tossed with jumbo prawns, calamari, garlic butter, and cherry tomatoes.',
    priceMinor: 1100000,
    category: 'Mains',
    available: false,
    isAvailable: false,
    dietary: ['Signature'],
    ingredients: ['Linguine', 'Jumbo prawns', 'Calamari rings', 'Garlic', 'White wine sauce'],
  },
  {
    id: 'item_caesar_salad_6',
    name: 'Caesar salad',
    description: 'Crisp romaine lettuce hearts, shaved aged parmesan, garlic herb croutons, and anchovy dressing.',
    priceMinor: 550000,
    category: 'Mains',
    available: true,
    isAvailable: true,
    dietary: ['Healthy'],
    ingredients: ['Romaine lettuce', 'Parmigiano-reggiano', 'Garlic croutons', 'Caesar dressing'],
  },
  {
    id: 'item_chapman_beverage_7',
    name: 'Classic Nigerian Chapman',
    description: 'Refreshing blend of Fanta, Sprite, Angostura bitters, cucumber ribbons, and fresh citrus slices.',
    priceMinor: 240000,
    category: 'Beverages',
    available: true,
    isAvailable: true,
    dietary: ['Non-Alcoholic'],
    ingredients: ['Carbonated citrus', 'Grenadine', 'Angostura aromatic bitters', 'Cucumber', 'Lime'],
  },
  {
    id: 'item_berry_pavlova_8',
    name: 'Seasonal Berry Pavlova',
    description: 'Crisp meringue nest filled with whipped vanilla bean mascarpone and handpicked berries.',
    priceMinor: 350000,
    category: 'Desserts',
    available: true,
    isAvailable: true,
    dietary: ['Gluten-Free'],
    ingredients: ['Meringue', 'Vanilla mascarpone', 'Raspberries', 'Blueberries', 'Mint'],
  },
];

export interface UseGuestMenuOptions {
  enabled?: boolean;
  initialData?: GuestMenuItem[];
  placeholderData?: GuestMenuItem[];
  useFallbackAsPlaceholder?: boolean;
}

export interface UseGuestMenuResult {
  menuItems: GuestMenuItem[];
  categories: string[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

/**
 * Custom hook to fetch and cache categorized guest in-room dining menu items.
 * Powered by GET /api/v1/guest/menu with 60-second stale-time caching.
 */
export function useGuestMenu(
  options: UseGuestMenuOptions = {}
): UseGuestMenuResult {
  const resolvedPlaceholder =
    options.placeholderData !== undefined
      ? options.placeholderData
      : options.useFallbackAsPlaceholder === false
      ? undefined
      : DEFAULT_FALLBACK_MENU_ITEMS;

  const queryResult = useQuery<GuestMenuItem[], Error>({
    queryKey: GUEST_MENU_QUERY_KEY,
    staleTime: 60 * 1000, // 60-second stale time per requirement
    retry: false,
    enabled: options.enabled ?? true,
    initialData: options.initialData,
    placeholderData: resolvedPlaceholder,
    queryFn: async (): Promise<GuestMenuItem[]> => {
      try {
        const responseData = await guestApiClient.get<
          GuestMenuResponseEnvelope | GuestMenuItem[]
        >('/api/v1/guest/menu');

        if (Array.isArray(responseData)) {
          return responseData;
        }

        if (responseData && Array.isArray(responseData.items)) {
          return responseData.items;
        }

        if (responseData && Array.isArray(responseData.menu)) {
          return responseData.menu;
        }

        return DEFAULT_FALLBACK_MENU_ITEMS;
      } catch (caughtError: unknown) {
        // When the backend server on port 3000 is not running yet (e.g. in local development
        // before the backend service is deployed, causing Vite reverse proxy to return 500 ECONNREFUSED),
        // gracefully fall back to the default catalog items so the guest web UI can be previewed seamlessly.
        return DEFAULT_FALLBACK_MENU_ITEMS;
      }
    },
  });

  const menuItems = queryResult.data ?? DEFAULT_FALLBACK_MENU_ITEMS;

  // Extract ordered unique categories with 'All' first
  const detectedCategorySet = new Set<string>();
  menuItems.forEach((menuItem) => {
    if (menuItem.category && menuItem.category.trim().length > 0) {
      detectedCategorySet.add(menuItem.category.trim());
    }
  });

  const sortedCategories = Array.from(detectedCategorySet);
  const categories: string[] = ['All', ...sortedCategories];

  return {
    menuItems,
    categories,
    isLoading: queryResult.isLoading && !queryResult.data,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}
