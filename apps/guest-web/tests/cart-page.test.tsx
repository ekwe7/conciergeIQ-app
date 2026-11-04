import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CartPage } from '../src/pages/CartPage';
import { useCartStore } from '../src/features/cart/store';
import { GuestMenuItem } from '../src/features/menu/types';

describe('CartPage Component Suite', () => {
  const sampleDishA: GuestMenuItem = {
    id: 'dish_jollof',
    name: 'Jollof rice & grilled chicken',
    description: 'Smoky party jollof with quarter chicken.',
    priceMinor: 850000, // ₦8,500
    category: 'Mains',
    available: true,
  };

  const sampleDishB: GuestMenuItem = {
    id: 'dish_burger',
    name: 'Azure club burger',
    description: 'Beef patty with cheddar.',
    priceMinor: 920000, // ₦9,200
    category: 'Mains',
    available: true,
  };

  beforeEach(() => {
    window.sessionStorage.clear();
    useCartStore.getState().clearCart();
    useCartStore.getState().setStayIdentifier('stay_test_101');
  });

  function renderCartPage(properties: React.ComponentProps<typeof CartPage> = {}) {
    return render(
      <MemoryRouter initialEntries={['/cart']}>
        <Routes>
          <Route path="/cart" element={<CartPage {...properties} />} />
          <Route path="/menu" element={<div data-testid="mock-menu-page">Menu Page</div>} />
          <Route path="/orders/:orderId" element={<div data-testid="mock-order-tracking-page">Tracking Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('renders empty cart view with Browse Menu redirect action when cart has no items', () => {
    const handleNavigateToMenu = vi.fn();

    renderCartPage({
      onNavigateToMenu: handleNavigateToMenu,
    });

    expect(screen.getByTestId('cart-empty-view')).toBeDefined();
    expect(screen.getByText('Your cart is empty')).toBeDefined();

    const browseMenuButton = screen.getByRole('button', { name: /browse menu/i });
    fireEvent.click(browseMenuButton);

    expect(handleNavigateToMenu).toHaveBeenCalledTimes(1);
  });

  it('renders line items with inline quantity steppers, notes, and pricing breakdown', () => {
    useCartStore.getState().addItem(sampleDishA, 2, 'Extra pepper please');
    useCartStore.getState().addItem(sampleDishB, 1);

    renderCartPage();

    expect(screen.getByTestId('cart-populated-view')).toBeDefined();
    expect(screen.getByText('Jollof rice & grilled chicken')).toBeDefined();
    expect(screen.getByText('Azure club burger')).toBeDefined();
    expect(screen.getByText('Extra pepper please')).toBeDefined();
    expect(screen.getByText('Room 101')).toBeDefined();

    // Verify financial breakdown
    // Subtotal: (8,500 * 2) + 9,200 = 26,200
    expect(screen.getByText('Subtotal')).toBeDefined();
    expect(screen.getByText('Service charge (10%)')).toBeDefined();
    expect(screen.getByText('VAT (7.5%)')).toBeDefined();

    // Pricing disclaimer
    const disclaimerSection = screen.getByTestId('cart-pricing-disclaimer');
    expect(disclaimerSection).toBeDefined();
    expect(
      screen.getByText('Final price and room delivery confirmed upon submission')
    ).toBeDefined();
  });

  it('increments, decrements, and deletes cart line items via inline steppers', () => {
    useCartStore.getState().addItem(sampleDishA, 2);

    renderCartPage();

    const increaseButton = screen.getByRole('button', {
      name: /increase quantity of jollof rice & grilled chicken/i,
    });
    const decreaseButton = screen.getByRole('button', {
      name: /decrease quantity of jollof rice & grilled chicken/i,
    });

    // Increment from 2 to 3
    fireEvent.click(increaseButton);
    expect(useCartStore.getState().lineItems[0].quantity).toBe(3);

    // Decrement from 3 to 2
    fireEvent.click(decreaseButton);
    expect(useCartStore.getState().lineItems[0].quantity).toBe(2);

    // Decrement from 2 to 1
    fireEvent.click(decreaseButton);
    expect(useCartStore.getState().lineItems[0].quantity).toBe(1);

    // Decrement from 1 to 0 -> line item removed, cart becomes empty!
    fireEvent.click(decreaseButton);
    expect(useCartStore.getState().lineItems.length).toBe(0);
    expect(screen.getByTestId('cart-empty-view')).toBeDefined();
  });

  it('allows editing preparation notes inline within the cart line item', () => {
    useCartStore.getState().addItem(sampleDishA, 1, 'Initial note');

    renderCartPage();

    expect(screen.getByText('Initial note')).toBeDefined();

    const editNoteButton = screen.getByRole('button', {
      name: /edit note for jollof rice & grilled chicken/i,
    });
    fireEvent.click(editNoteButton);

    const noteInputField = screen.getByLabelText(/kitchen note:/i);
    fireEvent.change(noteInputField, {
      target: { value: 'Modified spicy level 2' },
    });

    const saveNoteButton = screen.getByRole('button', { name: /save note/i });
    fireEvent.click(saveNoteButton);

    expect(useCartStore.getState().lineItems[0].specialInstructions).toBe(
      'Modified spicy level 2'
    );
    expect(screen.getByText('Modified spicy level 2')).toBeDefined();
  });

  it('clears all items when clicking the Clear header button', () => {
    useCartStore.getState().addItem(sampleDishA, 1);
    useCartStore.getState().addItem(sampleDishB, 1);

    const handleClearCart = vi.fn();

    renderCartPage({
      onClearCart: handleClearCart,
    });

    expect(screen.getByTestId('cart-populated-view')).toBeDefined();

    const clearAllButton = screen.getByRole('button', {
      name: /clear all cart items/i,
    });
    fireEvent.click(clearAllButton);

    expect(handleClearCart).toHaveBeenCalledTimes(1);
    expect(useCartStore.getState().lineItems.length).toBe(0);
    expect(screen.getByTestId('cart-empty-view')).toBeDefined();
  });

  it('places order and navigates to order confirmation upon submission', async () => {
    useCartStore.getState().addItem(sampleDishA, 1);

    const handleOrderSuccess = vi.fn();

    renderCartPage({
      onOrderSuccess: handleOrderSuccess,
    });

    const placeOrderButton = screen.getByTestId('place-order-checkout-button');
    fireEvent.click(placeOrderButton);

    await waitFor(() => {
      expect(handleOrderSuccess).toHaveBeenCalledTimes(1);
    });

    expect(useCartStore.getState().lineItems.length).toBe(0);
  });
});
