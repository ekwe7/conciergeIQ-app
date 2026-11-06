import { GuestMenuItem } from '../menu/types';

/**
 * A line item inside the guest shopping cart.
 * If the same menu item is customized with different preparation notes,
 * it is stored as a distinct cart line item.
 */
export interface CartLineItem {
  lineIdentifier: string;
  item: GuestMenuItem;
  quantity: number;
  specialInstructions?: string;
}

/**
 * Monetary breakdown of estimated cart charges in integer minor units (kobo/cents).
 */
export interface CartTotalsBreakdown {
  subtotalMinorUnits: number;
  serviceChargeMinorUnits: number; // 10% room service hospitality fee
  estimatedTaxMinorUnits: number; // 7.5% VAT
  estimatedTotalMinorUnits: number;
  totalItemCount: number;
}

/**
 * Zustand Cart Store state and actions contract.
 */
export interface CartStoreState {
  stayIdentifier: string | null;
  lineItems: CartLineItem[];

  // Cart manipulation actions
  addItem: (
    menuItem: GuestMenuItem,
    quantity?: number,
    specialInstructions?: string
  ) => void;
  removeItem: (targetLineIdentifier: string) => void;
  updateQuantity: (targetLineIdentifier: string, newQuantity: number) => void;
  updateSpecialInstructions: (
    targetLineIdentifier: string,
    newSpecialInstructions: string
  ) => void;
  clearCart: () => void;
  setStayIdentifier: (newStayIdentifier: string | null) => void;

  // Selectors
  getTotals: () => CartTotalsBreakdown;
  getTotalItemCount: () => number;
  getSubtotalMinor: () => number;
  getEstimatedServiceChargeMinor: () => number;
  getEstimatedTaxMinor: () => number;
  getEstimatedTotalMinor: () => number;
}

/**
 * Generates a stable unique identifier for a cart line based on item ID
 * and normalized kitchen preparation instructions.
 */
export function generateCartLineIdentifier(
  menuItemId: string,
  specialInstructions?: string
): string {
  const normalizedInstructions = (specialInstructions || '').trim().toLowerCase();
  return `${menuItemId}:${normalizedInstructions}`;
}

/**
 * Computes integer minor totals safely without floating-point math.
 */
export function calculateCartTotals(lineItems: CartLineItem[]): CartTotalsBreakdown {
  const totalItemCount = lineItems.reduce(
    (runningCount, lineEntry) => runningCount + lineEntry.quantity,
    0
  );

  const subtotalMinorUnits = lineItems.reduce(
    (runningSubtotal, lineEntry) =>
      runningSubtotal + lineEntry.item.priceMinor * lineEntry.quantity,
    0
  );

  // 10% Service Charge
  const serviceChargeMinorUnits = Math.round(subtotalMinorUnits * 0.1);

  // 7.5% VAT
  const estimatedTaxMinorUnits = Math.round(subtotalMinorUnits * 0.075);

  const estimatedTotalMinorUnits =
    subtotalMinorUnits + serviceChargeMinorUnits + estimatedTaxMinorUnits;

  return {
    subtotalMinorUnits,
    serviceChargeMinorUnits,
    estimatedTaxMinorUnits,
    estimatedTotalMinorUnits,
    totalItemCount,
  };
}
