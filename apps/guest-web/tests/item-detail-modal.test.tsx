import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ItemDetailModal } from '../src/features/menu/components/ItemDetailModal';
import { GuestMenuItem } from '../src/features/menu/types';

describe('ItemDetailModal Component Suite', () => {
  const sampleMenuItem: GuestMenuItem = {
    id: 'item_jollof_test',
    name: 'Jollof rice & grilled chicken',
    description: 'Smoky party jollof with quarter chicken, plantain and fresh coleslaw.',
    priceMinor: 850000,
    category: 'Mains',
    available: true,
    isAvailable: true,
    ingredients: ['Parboiled rice', 'Plum tomatoes', 'Scotch bonnet', 'Quarter chicken', 'Plantain'],
  };

  it('renders modal dialog with item details when open', () => {
    const handleClose = vi.fn();
    const handleAddToCart = vi.fn();

    render(
      <ItemDetailModal
        isOpen={true}
        menuItem={sampleMenuItem}
        onClose={handleClose}
        onAddToCart={handleAddToCart}
      />
    );

    const modalDialog = screen.getByRole('dialog');
    expect(modalDialog).toBeDefined();
    expect(screen.getByRole('dialog', { name: /Jollof rice & grilled chicken/i })).toBeDefined();
    expect(screen.getByText('Smoky party jollof with quarter chicken, plantain and fresh coleslaw.')).toBeDefined();
    expect(screen.getByText(/Parboiled rice/i)).toBeDefined();
    expect(screen.getAllByText(/Quarter chicken/i).length).toBeGreaterThanOrEqual(1);
  });

  it('enforces quantity bounds strictly between minimum 1 and maximum 20', () => {
    const handleClose = vi.fn();
    const handleAddToCart = vi.fn();

    render(
      <ItemDetailModal
        isOpen={true}
        menuItem={sampleMenuItem}
        onClose={handleClose}
        onAddToCart={handleAddToCart}
      />
    );

    const decreaseQuantityButton = screen.getByRole('button', { name: /decrease quantity/i });
    const increaseQuantityButton = screen.getByRole('button', { name: /increase quantity/i });
    const quantityDisplay = screen.getByTestId('quantity-counter-value');

    // Initial state: quantity should be 1, decrease button disabled
    expect(quantityDisplay.textContent).toBe('1');
    expect(decreaseQuantityButton).toHaveProperty('disabled', true);

    // Click decrease when at min (1) - should remain 1
    fireEvent.click(decreaseQuantityButton);
    expect(quantityDisplay.textContent).toBe('1');

    // Increment up to 3
    fireEvent.click(increaseQuantityButton);
    expect(quantityDisplay.textContent).toBe('2');
    expect(decreaseQuantityButton).toHaveProperty('disabled', false);

    fireEvent.click(increaseQuantityButton);
    expect(quantityDisplay.textContent).toBe('3');

    // Decrement back down to 1
    fireEvent.click(decreaseQuantityButton);
    expect(quantityDisplay.textContent).toBe('2');
    fireEvent.click(decreaseQuantityButton);
    expect(quantityDisplay.textContent).toBe('1');
    expect(decreaseQuantityButton).toHaveProperty('disabled', true);

    // Loop increments up to maximum (20)
    for (let counterIndex = 1; counterIndex < 20; counterIndex += 1) {
      fireEvent.click(increaseQuantityButton);
    }
    expect(quantityDisplay.textContent).toBe('20');
    expect(increaseQuantityButton).toHaveProperty('disabled', true);

    // Clicking increase at 20 should remain 20
    fireEvent.click(increaseQuantityButton);
    expect(quantityDisplay.textContent).toBe('20');
  });

  it('captures kitchen preparation notes within 200 character limit', () => {
    const handleClose = vi.fn();
    const handleAddToCart = vi.fn();

    render(
      <ItemDetailModal
        isOpen={true}
        menuItem={sampleMenuItem}
        onClose={handleClose}
        onAddToCart={handleAddToCart}
      />
    );

    const kitchenNotesInput = screen.getByPlaceholderText(/Less pepper please, extra plantain/i);
    const customInstructionText = 'Extra spicy sauce and well-done grilled chicken please.';

    fireEvent.change(kitchenNotesInput, {
      target: { value: customInstructionText },
    });

    expect((kitchenNotesInput as HTMLTextAreaElement).value).toBe(customInstructionText);
    expect(screen.getByText(/characters remaining/i)).toBeDefined();

    // Submit customization
    const addToCartSubmitButton = screen.getByTestId('add-to-cart-submit-button');
    fireEvent.click(addToCartSubmitButton);

    expect(handleAddToCart).toHaveBeenCalledTimes(1);
    expect(handleAddToCart).toHaveBeenCalledWith({
      item: sampleMenuItem,
      quantity: 1,
      specialInstructions: customInstructionText,
    });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('dismisses modal on Escape key press and close button tap', () => {
    const handleClose = vi.fn();
    const handleAddToCart = vi.fn();

    const { rerender } = render(
      <ItemDetailModal
        isOpen={true}
        menuItem={sampleMenuItem}
        onClose={handleClose}
        onAddToCart={handleAddToCart}
      />
    );

    // Tap X close button
    const closeButton = screen.getByRole('button', { name: /close item customizer/i });
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Press Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);

    // When closed, nothing renders
    rerender(
      <ItemDetailModal
        isOpen={false}
        menuItem={sampleMenuItem}
        onClose={handleClose}
        onAddToCart={handleAddToCart}
      />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
