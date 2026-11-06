import React from 'react';
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MenuPage } from '../src/pages/MenuPage';
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

const mockMenuItems: GuestMenuItem[] = [
  {
    id: 'item_test_1',
    name: 'Artisan Avocado & Poached Egg Toast',
    description: 'Sourdough toast topped with smashed avocado and eggs.',
    priceMinor: 450000,
    category: 'Breakfast',
    available: true,
    isAvailable: true,
  },
  {
    id: 'item_test_2',
    name: 'Jollof rice & grilled chicken',
    description: 'Smoky party jollof with quarter chicken.',
    priceMinor: 850000,
    category: 'Mains',
    available: true,
    isAvailable: true,
    isPopular: true,
  },
  {
    id: 'item_test_3',
    name: 'Seafood pasta',
    description: 'Linguine with jumbo prawns.',
    priceMinor: 1100000,
    category: 'Mains',
    available: false,
    isAvailable: false,
  },
  {
    id: 'item_test_4',
    name: 'Classic Nigerian Chapman',
    description: 'Refreshing citrus mocktail.',
    priceMinor: 240000,
    category: 'Beverages',
    available: true,
    isAvailable: true,
  },
];

function createIsolatedTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderMenuPageWithQueryClient(
  properties: React.ComponentProps<typeof MenuPage> = {}
) {
  const queryClient = createIsolatedTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MenuPage {...properties} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('MenuPage Component Suite', () => {
  it('renders menu items and filters by category tabs correctly', async () => {
    mockServer.use(
      http.get(menuEndpointPattern, () => {
        return HttpResponse.json(mockMenuItems);
      })
    );

    renderMenuPageWithQueryClient();

    // Verify header and initial "All" view shows items
    expect(screen.getByText('Room service')).toBeDefined();
    expect(screen.getByText('In-Room Dining')).toBeDefined();

    await waitFor(
      () => {
        expect(screen.getByTestId('menu-item-card-item_test_2')).toBeDefined();
        expect(screen.getByTestId('menu-item-card-item_test_1')).toBeDefined();
        expect(screen.getByTestId('menu-item-card-item_test_4')).toBeDefined();
      },
      { timeout: 5000 }
    );

    // Click on "Breakfast" category tab
    const breakfastCategoryTab = screen.getByRole('tab', { name: 'Breakfast' });
    fireEvent.click(breakfastCategoryTab);

    // Verify Breakfast item is displayed, but Mains and Beverages are filtered out
    await waitFor(() => {
      expect(screen.getByText('Artisan Avocado & Poached Egg Toast')).toBeDefined();
      expect(screen.queryByText('Jollof rice & grilled chicken')).toBeNull();
      expect(screen.queryByText('Classic Nigerian Chapman')).toBeNull();
    });

    // Click on "Mains" tab
    const mainsCategoryTab = screen.getByRole('tab', { name: 'Mains' });
    fireEvent.click(mainsCategoryTab);

    await waitFor(() => {
      expect(screen.getByText('Jollof rice & grilled chicken')).toBeDefined();
      expect(screen.getByText('Seafood pasta')).toBeDefined();
      expect(screen.queryByText('Artisan Avocado & Poached Egg Toast')).toBeNull();
    });
  }, 15000);

  it('renders loading skeleton while query is in-flight', async () => {
    renderMenuPageWithQueryClient({ isLoading: true });

    // Loading skeleton should be visible
    expect(screen.getByTestId('menu-loading-skeleton')).toBeDefined();
  });

  it('displays empty category state when no items match category or search filter', async () => {
    mockServer.use(
      http.get(menuEndpointPattern, () => {
        return HttpResponse.json(mockMenuItems);
      })
    );

    renderMenuPageWithQueryClient();

    await waitFor(() => {
      expect(screen.getByTestId('menu-item-card-item_test_2')).toBeDefined();
    });

    // Enter a search query with no matching items
    const searchInputElement = screen.getByPlaceholderText(/Search the menu/i);
    fireEvent.change(searchInputElement, {
      target: { value: 'Nonexistent Caviar Dish' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('empty-category-view')).toBeDefined();
      expect(screen.getByText(/No items found/i)).toBeDefined();
      expect(screen.getByText(/No menu items matching "Nonexistent Caviar Dish"/i)).toBeDefined();
    });

    // Tap View All Items to reset
    const viewAllButton = screen.getByRole('button', { name: /View All Items/i });
    fireEvent.click(viewAllButton);

    await waitFor(() => {
      expect(screen.queryByTestId('empty-category-view')).toBeNull();
      expect(screen.getByText('Jollof rice & grilled chicken')).toBeDefined();
    });
  });

  it('disables out-of-stock items and prevents opening customization modal', async () => {
    mockServer.use(
      http.get(menuEndpointPattern, () => {
        return HttpResponse.json(mockMenuItems);
      })
    );

    renderMenuPageWithQueryClient();

    await waitFor(() => {
      expect(screen.getByTestId('menu-item-card-item_test_3')).toBeDefined();
    });

    // Seafood pasta is unavailable (out of stock)
    const unavailableBadge = screen.getByTestId('item-unavailable-badge');
    expect(unavailableBadge).toBeDefined();
    expect(unavailableBadge.textContent).toBe('Unavailable');

    const outOfStockCard = screen.getByTestId('menu-item-card-item_test_3');
    expect(outOfStockCard).toHaveProperty('getAttribute');
    expect(outOfStockCard.getAttribute('aria-disabled')).toBe('true');

    // Clicking out-of-stock card should NOT open the modal
    fireEvent.click(outOfStockCard);
    expect(screen.queryByRole('dialog')).toBeNull();

    // Clicking an available item card opens the customization modal
    const availableCard = screen.getByTestId('menu-item-card-item_test_2');
    fireEvent.click(availableCard);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByRole('dialog', { name: /Jollof rice & grilled chicken/i })).toBeDefined();
  });

  it('updates floating cart bar when items are added from customization modal', async () => {
    mockServer.use(
      http.get(menuEndpointPattern, () => {
        return HttpResponse.json(mockMenuItems);
      })
    );

    const handleAddToCart = vi.fn();

    renderMenuPageWithQueryClient({
      onAddToCart: handleAddToCart,
    });

    await waitFor(() => {
      expect(screen.getByTestId('menu-item-card-item_test_2')).toBeDefined();
    });

    // Open modal for Jollof rice
    const availableCard = screen.getByTestId('menu-item-card-item_test_2');
    fireEvent.click(availableCard);

    // Increase quantity to 2
    const increaseQuantityButton = screen.getByRole('button', { name: /increase quantity/i });
    fireEvent.click(increaseQuantityButton);

    // Add notes
    const kitchenNotesInput = screen.getByPlaceholderText(/Less pepper please, extra plantain/i);
    fireEvent.change(kitchenNotesInput, {
      target: { value: 'Mild spice only please' },
    });

    // Submit add to cart
    const submitButton = screen.getByTestId('add-to-cart-submit-button');
    fireEvent.click(submitButton);

    expect(handleAddToCart).toHaveBeenCalledTimes(1);

    // Verify floating cart summary appears
    await waitFor(() => {
      const floatingCartButton = screen.getByTestId('floating-view-cart-button');
      expect(floatingCartButton).toBeDefined();
      expect(floatingCartButton.textContent).toContain('View cart');
    });
  });
});
