import { MenuItem as ContractMenuItem } from '@conciergeiq/contracts';

/**
 * Extended Menu Item definition for the guest web application.
 * Normalizes both `available` and `isAvailable` property variations,
 * and accommodates server-formatted prices, ingredient details, and customization options.
 */
export interface GuestMenuItem extends ContractMenuItem {
  isAvailable?: boolean;
  formattedPrice?: string;
  currency?: string;
  ingredients?: string[];
  preparationTimeMinutes?: number;
  isPopular?: boolean;
  options?: MenuItemOption[];
}

export interface MenuItemOption {
  id: string;
  name: string;
  priceDeltaMinor: number;
  isDefault?: boolean;
}

export interface MenuItemOptionGroup {
  id: string;
  name: string;
  required?: boolean;
  options: MenuItemOption[];
}

export interface GuestMenuResponseEnvelope {
  items?: GuestMenuItem[];
  menu?: GuestMenuItem[];
  categories?: string[];
  currency?: string;
}

export interface CustomizedCartItemPayload {
  item: GuestMenuItem;
  quantity: number;
  specialInstructions: string;
}

/**
 * Determines whether an item is available for ordering, checking both
 * `isAvailable` and `available` flags.
 */
export function isMenuItemAvailable(candidateItem: GuestMenuItem): boolean {
  if (typeof candidateItem.isAvailable === 'boolean') {
    return candidateItem.isAvailable;
  }
  if (typeof candidateItem.available === 'boolean') {
    return candidateItem.available;
  }
  return true;
}

/**
 * Formats integer minor currency units into a localized currency string.
 * Defaults to Nigerian Naira (NGN) matching the ConciergeIQ design system.
 */
export function formatCurrencyAmount(
  amountMinorUnits: number,
  currencyCode: string = 'NGN'
): string {
  const majorCurrencyAmount = amountMinorUnits / 100;

  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(majorCurrencyAmount);
  } catch {
    return `₦${majorCurrencyAmount.toLocaleString()}`;
  }
}
