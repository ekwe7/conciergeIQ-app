/**
 * ItemAvailabilityTable — Component tests.
 *
 * Verifies:
 *   1. Renders table rows with item names, category tags, and formatted prices.
 *   2. Filters items in real time via search input matching name, description, or category.
 *   3. Filters items using availability status buttons (All, Available, 86'd).
 *   4. Filters items matching selectedCategoryId.
 *   5. Calls onEditItem callback when Edit button is clicked (when canEdit=true).
 *   6. Displays empty state message when search returns no matching items.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../src/app/providers';
import { createQueryClient } from '../src/app/query-client';
import { ItemAvailabilityTable } from '../src/features/menu/components/ItemAvailabilityTable';
import type { MenuCategory, MenuItem } from '../src/lib/api-types';
import { session } from '../src/lib/session';
import { fakeApi, signedInHandlers } from './support';

function createMenuItemFixture(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'item-1',
    categoryId: 'category-mains',
    name: 'Jollof Rice with Fried Plantain',
    description: 'Smoky party jollof with sweet plantain',
    price: 4500,
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

function renderItemAvailabilityTable({
  categories,
  selectedCategoryId = null,
  currency = 'NGN',
  canEdit = false,
  canToggle = true,
  onEditItem,
}: {
  categories: MenuCategory[];
  selectedCategoryId?: string | null;
  currency?: string;
  canEdit?: boolean;
  canToggle?: boolean;
  onEditItem?: (targetItem: MenuItem) => void;
}) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({
    queries: { retry: false, refetchInterval: false, refetchOnWindowFocus: false },
  });

  return render(
    <AppProviders queryClient={queryClient}>
      <ItemAvailabilityTable
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        currency={currency}
        canEdit={canEdit}
        canToggle={canToggle}
        onEditItem={onEditItem}
      />
    </AppProviders>,
  );
}

describe('ItemAvailabilityTable Component Suite', () => {
  beforeEach(() => {
    session.store({
      accessToken: 'access-token-test',
      refreshToken: 'refresh-token-test',
    });
    fakeApi({
      ...signedInHandlers('MANAGER'),
    });
  });

  it('renders menu items with formatted prices and category tags', () => {
    const mockCategories: MenuCategory[] = [
      createCategoryFixture({
        id: 'category-mains',
        name: 'Mains',
        items: [
          createMenuItemFixture({
            id: 'item-1',
            name: 'Jollof Rice',
            price: 5000,
            isAvailable: true,
          }),
        ],
      }),
      createCategoryFixture({
        id: 'category-drinks',
        name: 'Drinks',
        items: [
          createMenuItemFixture({
            id: 'item-2',
            name: 'Hibiscus Zobo',
            price: 2000,
            isAvailable: false,
          }),
        ],
      }),
    ];

    renderItemAvailabilityTable({
      categories: mockCategories,
      currency: 'NGN',
    });

    expect(screen.getByText('Jollof Rice')).toBeTruthy();
    expect(screen.getByText('₦5,000')).toBeTruthy();
    expect(screen.getByText('Hibiscus Zobo')).toBeTruthy();
    expect(screen.getByText('₦2,000')).toBeTruthy();
    expect(screen.getByText("86'd (1)")).toBeTruthy();
  });

  it('filters items in real-time when typing in search input', () => {
    const mockCategories: MenuCategory[] = [
      createCategoryFixture({
        id: 'category-mains',
        items: [
          createMenuItemFixture({
            id: 'item-1',
            name: 'Grilled Tilapia',
            description: 'Whole spiced fish',
          }),
          createMenuItemFixture({
            id: 'item-2',
            name: 'Pounded Yam',
            description: 'Smooth white yam swallow',
          }),
        ],
      }),
    ];

    renderItemAvailabilityTable({
      categories: mockCategories,
    });

    expect(screen.getByText('Grilled Tilapia')).toBeTruthy();
    expect(screen.getByText('Pounded Yam')).toBeTruthy();

    const searchInputElement = screen.getByPlaceholderText(
      /Search items by name or description.../i,
    );
    fireEvent.change(searchInputElement, { target: { value: 'Tilapia' } });

    expect(screen.getByText('Grilled Tilapia')).toBeTruthy();
    expect(screen.queryByText('Pounded Yam')).toBeNull();
  });

  it('filters items by availability status pills', () => {
    const mockCategories: MenuCategory[] = [
      createCategoryFixture({
        items: [
          createMenuItemFixture({
            id: 'item-available',
            name: 'Available Dish',
            isAvailable: true,
          }),
          createMenuItemFixture({
            id: 'item-unavailable',
            name: 'Out of Stock Dish',
            isAvailable: false,
          }),
        ],
      }),
    ];

    renderItemAvailabilityTable({
      categories: mockCategories,
    });

    expect(screen.getByText('Available Dish')).toBeTruthy();
    expect(screen.getByText('Out of Stock Dish')).toBeTruthy();

    // Click "Available" pill
    const availablePillButton = screen.getByRole('button', {
      name: /Available \(1\)/i,
    });
    fireEvent.click(availablePillButton);

    expect(screen.getByText('Available Dish')).toBeTruthy();
    expect(screen.queryByText('Out of Stock Dish')).toBeNull();

    // Click "86'd" pill
    const unavailablePillButton = screen.getByRole('button', {
      name: /86'd \(1\)/i,
    });
    fireEvent.click(unavailablePillButton);

    expect(screen.queryByText('Available Dish')).toBeNull();
    expect(screen.getByText('Out of Stock Dish')).toBeTruthy();
  });

  it('filters items by selectedCategoryId', () => {
    const mockCategories: MenuCategory[] = [
      createCategoryFixture({
        id: 'category-mains',
        name: 'Mains',
        items: [
          createMenuItemFixture({
            id: 'item-mains',
            name: 'Pepper Soup',
            categoryId: 'category-mains',
          }),
        ],
      }),
      createCategoryFixture({
        id: 'category-desserts',
        name: 'Desserts',
        items: [
          createMenuItemFixture({
            id: 'item-dessert',
            name: 'Puff Puff',
            categoryId: 'category-desserts',
          }),
        ],
      }),
    ];

    renderItemAvailabilityTable({
      categories: mockCategories,
      selectedCategoryId: 'category-desserts',
    });

    expect(screen.queryByText('Pepper Soup')).toBeNull();
    expect(screen.getByText('Puff Puff')).toBeTruthy();
  });

  it('renders Edit button and triggers onEditItem callback when clicked', () => {
    const onEditItemCallback = vi.fn();
    const mockItem = createMenuItemFixture({
      id: 'item-editable',
      name: 'Editable Shawarma',
    });
    const mockCategories: MenuCategory[] = [
      createCategoryFixture({
        items: [mockItem],
      }),
    ];

    renderItemAvailabilityTable({
      categories: mockCategories,
      canEdit: true,
      onEditItem: onEditItemCallback,
    });

    const editButton = screen.getByRole('button', {
      name: /Edit Editable Shawarma/i,
    });
    fireEvent.click(editButton);

    expect(onEditItemCallback).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'item-editable', name: 'Editable Shawarma' }),
    );
  });

  it('displays empty state when search text matches no items', () => {
    const mockCategories: MenuCategory[] = [
      createCategoryFixture({
        items: [
          createMenuItemFixture({
            name: 'Existing Dish',
          }),
        ],
      }),
    ];

    renderItemAvailabilityTable({
      categories: mockCategories,
    });

    const searchInputElement = screen.getByPlaceholderText(
      /Search items by name or description.../i,
    );
    fireEvent.change(searchInputElement, { target: { value: 'NonexistentDishXYZ' } });

    expect(screen.getByText('No matching menu items found')).toBeTruthy();
    expect(
      screen.getByText(/No items match "NonexistentDishXYZ"/i),
    ).toBeTruthy();
  });
});
