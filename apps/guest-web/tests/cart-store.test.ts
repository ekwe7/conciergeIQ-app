import { describe, it, expect, beforeEach } from 'vitest';
import {
  useCartStore,
  GUEST_CART_STORAGE_KEY,
  MAXIMUM_CART_ITEM_QUANTITY,
} from '../src/features/cart/store';
import { GuestMenuItem } from '../src/features/menu/types';

describe('Zustand Shopping Cart Store Lifecycle & Calculations Suite', () => {
  const sampleMenuItemA: GuestMenuItem = {
    id: 'item_jollof_rice',
    name: 'Jollof rice & grilled chicken',
    description: 'Smoky party jollof with quarter chicken.',
    priceMinor: 850000, // ₦8,500.00
    category: 'Mains',
    available: true,
  };

  const sampleMenuItemB: GuestMenuItem = {
    id: 'item_club_burger',
    name: 'Azure club burger',
    description: 'Dry-aged beef burger with cheddar and fries.',
    priceMinor: 920000, // ₦9,200.00
    category: 'Mains',
    available: true,
  };

  beforeEach(() => {
    window.sessionStorage.clear();
    useCartStore.getState().clearCart();
    useCartStore.getState().setStayIdentifier(null);
  });

  it('adds an item to cart and calculates item count and subtotal', () => {
    const cartStoreInstance = useCartStore.getState();
    expect(cartStoreInstance.lineItems.length).toBe(0);
    expect(cartStoreInstance.getTotalItemCount()).toBe(0);

    cartStoreInstance.addItem(sampleMenuItemA, 2, 'Extra plantain please');

    const updatedState = useCartStore.getState();
    expect(updatedState.lineItems.length).toBe(1);
    expect(updatedState.getTotalItemCount()).toBe(2);
    expect(updatedState.lineItems[0].item.name).toBe('Jollof rice & grilled chicken');
    expect(updatedState.lineItems[0].quantity).toBe(2);
    expect(updatedState.lineItems[0].specialInstructions).toBe('Extra plantain please');
    expect(updatedState.getSubtotalMinor()).toBe(1700000); // 8,500 * 2 = 17,000.00
  });

  it('merges quantities when adding the same item with identical preparation notes', () => {
    const cartStoreInstance = useCartStore.getState();

    // First addition
    cartStoreInstance.addItem(sampleMenuItemA, 1, 'Mild spice');

    // Second addition with identical note
    cartStoreInstance.addItem(sampleMenuItemA, 2, 'Mild spice');

    const updatedState = useCartStore.getState();
    expect(updatedState.lineItems.length).toBe(1);
    expect(updatedState.lineItems[0].quantity).toBe(3);
    expect(updatedState.lineItems[0].specialInstructions).toBe('Mild spice');
  });

  it('creates distinct cart lines when adding the same item with different preparation notes', () => {
    const cartStoreInstance = useCartStore.getState();

    // First addition with note A
    cartStoreInstance.addItem(sampleMenuItemA, 1, 'Less pepper');

    // Second addition with note B
    cartStoreInstance.addItem(sampleMenuItemA, 1, 'Extra pepper and extra plantain');

    const updatedState = useCartStore.getState();
    expect(updatedState.lineItems.length).toBe(2);
    expect(updatedState.getTotalItemCount()).toBe(2);
    expect(updatedState.lineItems[0].specialInstructions).toBe('Less pepper');
    expect(updatedState.lineItems[1].specialInstructions).toBe('Extra pepper and extra plantain');
  });

  it('enforces maximum item quantity cap of 20 units', () => {
    const cartStoreInstance = useCartStore.getState();

    // Requesting excessive quantity
    cartStoreInstance.addItem(sampleMenuItemA, 25);

    let updatedState = useCartStore.getState();
    expect(updatedState.lineItems[0].quantity).toBe(MAXIMUM_CART_ITEM_QUANTITY);

    // Incremental addition exceeding 20
    cartStoreInstance.addItem(sampleMenuItemA, 5);
    updatedState = useCartStore.getState();
    expect(updatedState.lineItems[0].quantity).toBe(MAXIMUM_CART_ITEM_QUANTITY);

    // Updating quantity past 20
    cartStoreInstance.updateQuantity(updatedState.lineItems[0].lineIdentifier, 50);
    updatedState = useCartStore.getState();
    expect(updatedState.lineItems[0].quantity).toBe(MAXIMUM_CART_ITEM_QUANTITY);
  });

  it('decrements item quantity and automatically removes line item when quantity reaches 0', () => {
    const cartStoreInstance = useCartStore.getState();
    cartStoreInstance.addItem(sampleMenuItemA, 2);

    const initialLineIdentifier = useCartStore.getState().lineItems[0].lineIdentifier;

    // Decrement from 2 to 1
    cartStoreInstance.updateQuantity(initialLineIdentifier, 1);
    expect(useCartStore.getState().lineItems[0].quantity).toBe(1);

    // Decrement from 1 to 0 -> should remove line item
    cartStoreInstance.updateQuantity(initialLineIdentifier, 0);
    expect(useCartStore.getState().lineItems.length).toBe(0);
    expect(useCartStore.getState().getTotalItemCount()).toBe(0);
  });

  it('removes item directly via removeItem action', () => {
    const cartStoreInstance = useCartStore.getState();
    cartStoreInstance.addItem(sampleMenuItemA, 1);
    cartStoreInstance.addItem(sampleMenuItemB, 1);

    expect(useCartStore.getState().lineItems.length).toBe(2);

    const firstLineIdentifier = useCartStore.getState().lineItems[0].lineIdentifier;
    cartStoreInstance.removeItem(firstLineIdentifier);

    const updatedState = useCartStore.getState();
    expect(updatedState.lineItems.length).toBe(1);
    expect(updatedState.lineItems[0].item.id).toBe(sampleMenuItemB.id);
  });

  it('updates special instructions in place and handles collisions by merging', () => {
    const cartStoreInstance = useCartStore.getState();

    // Add item with empty note and item with note 'Extra cheese'
    cartStoreInstance.addItem(sampleMenuItemB, 2, 'No onions');
    cartStoreInstance.addItem(sampleMenuItemB, 1, 'Extra cheese');

    expect(useCartStore.getState().lineItems.length).toBe(2);

    const firstLineIdentifier = useCartStore.getState().lineItems[0].lineIdentifier;

    // Update note of first item to unique note 'Crispy fries'
    cartStoreInstance.updateSpecialInstructions(firstLineIdentifier, 'Crispy fries');
    expect(useCartStore.getState().lineItems[0].specialInstructions).toBe('Crispy fries');

    // Update note of first item to 'Extra cheese' -> should merge with second item
    const updatedFirstLineIdentifier = useCartStore.getState().lineItems[0].lineIdentifier;
    cartStoreInstance.updateSpecialInstructions(updatedFirstLineIdentifier, 'Extra cheese');

    const mergedState = useCartStore.getState();
    expect(mergedState.lineItems.length).toBe(1);
    expect(mergedState.lineItems[0].quantity).toBe(3);
    expect(mergedState.lineItems[0].specialInstructions).toBe('Extra cheese');

    // Updating instructions for nonexistent identifier is a safe no-op
    cartStoreInstance.updateSpecialInstructions('nonexistent_identifier', 'note');
    expect(useCartStore.getState().lineItems.length).toBe(1);
  });

  it('calculates 10% hospitality service charge and 7.5% VAT using integer arithmetic', () => {
    const cartStoreInstance = useCartStore.getState();

    // Sample lines matching prototype G04:
    // Jollof rice: ₦8,500
    // Azure club burger: ₦9,200
    // Chapman (2x): ₦2,400 each = ₦4,800
    // Total subtotal: 8,500 + 9,200 + 4,800 = 22,500 (2,250,000 minor)
    cartStoreInstance.addItem(sampleMenuItemA, 1); // 850,000
    cartStoreInstance.addItem(sampleMenuItemB, 1); // 920,000
    cartStoreInstance.addItem(
      {
        id: 'item_chapman',
        name: 'Chapman',
        description: 'Citrus mocktail',
        priceMinor: 240000,
        category: 'Beverages',
        available: true,
      },
      2
    ); // 480,000

    const totals = cartStoreInstance.getTotals();

    // Subtotal: 2,250,000
    expect(totals.subtotalMinorUnits).toBe(2250000);
    expect(cartStoreInstance.getSubtotalMinor()).toBe(2250000);

    // 10% Service Charge: 225,000
    expect(totals.serviceChargeMinorUnits).toBe(225000);
    expect(cartStoreInstance.getEstimatedServiceChargeMinor()).toBe(225000);

    // 7.5% VAT: 2,250,000 * 0.075 = 168,750
    expect(totals.estimatedTaxMinorUnits).toBe(168750);
    expect(cartStoreInstance.getEstimatedTaxMinor()).toBe(168750);

    // Total: 2,250,000 + 225,000 + 168,750 = 2,643,750
    expect(totals.estimatedTotalMinorUnits).toBe(2643750);
    expect(cartStoreInstance.getEstimatedTotalMinor()).toBe(2643750);
  });

  it('persists cart state to sessionStorage and clears cart completely', () => {
    const cartStoreInstance = useCartStore.getState();
    cartStoreInstance.addItem(sampleMenuItemA, 3, 'Allergy notice');

    // Confirm stored in sessionStorage
    const storedCartJson = window.sessionStorage.getItem(GUEST_CART_STORAGE_KEY);
    expect(storedCartJson).not.toBeNull();
    expect(storedCartJson).toContain('Jollof rice & grilled chicken');

    // Clear cart
    cartStoreInstance.clearCart();
    expect(useCartStore.getState().lineItems.length).toBe(0);
    expect(useCartStore.getState().getTotalItemCount()).toBe(0);
  });

  it('associates cart with active stay and clears items when stay identifier changes', () => {
    const cartStoreInstance = useCartStore.getState();
    cartStoreInstance.setStayIdentifier('stay_initial_101');
    cartStoreInstance.addItem(sampleMenuItemA, 2);

    expect(useCartStore.getState().lineItems.length).toBe(1);
    expect(useCartStore.getState().stayIdentifier).toBe('stay_initial_101');

    // Setting same stay preserves items
    cartStoreInstance.setStayIdentifier('stay_initial_101');
    expect(useCartStore.getState().lineItems.length).toBe(1);

    // Stay changes (e.g. new checkout/checkin) -> flushes cart items
    cartStoreInstance.setStayIdentifier('stay_different_202');
    expect(useCartStore.getState().stayIdentifier).toBe('stay_different_202');
    expect(useCartStore.getState().lineItems.length).toBe(0);
  });
});
