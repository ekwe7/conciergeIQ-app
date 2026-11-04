/**
 * Currency and monetary formatting utilities.
 * Handles integer minor currency units (e.g. cents, kobo, pence) safely
 * without floating-point math rounding discrepancies.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/**
 * Formats an integer minor currency unit into a localized currency string.
 * Strictly requires integer input to prevent floating-point calculation errors.
 *
 * @param minorUnits - Amount in smallest currency units (e.g. 350000 minor units in NGN = ₦3,500.00).
 * @param currencyCode - ISO 4217 currency code (e.g. 'NGN', 'USD', 'EUR', 'GBP').
 * @returns Formatted currency string with appropriate symbol, commas, and two decimal places.
 */
export function formatMinorUnits(minorUnits: number, currencyCode: string = 'USD'): string {
  if (!Number.isInteger(minorUnits)) {
    throw new TypeError(
      `Monetary amounts must be supplied as integer minor units. Received non-integer value: ${minorUnits}`
    );
  }

  const isNegative = minorUnits < 0;
  const absoluteMinorUnits = Math.abs(minorUnits);

  const majorUnits = Math.floor(absoluteMinorUnits / 100);
  const minorRemainder = absoluteMinorUnits % 100;

  const paddedMinorUnits = minorRemainder.toString().padStart(2, '0');
  const formattedMajorUnits = new Intl.NumberFormat('en-US').format(majorUnits);

  const normalizedCurrencyCode = currencyCode.toUpperCase();
  const currencySymbol = CURRENCY_SYMBOLS[normalizedCurrencyCode] ?? `${normalizedCurrencyCode} `;

  const formattedAmount = `${currencySymbol}${formattedMajorUnits}.${paddedMinorUnits}`;

  return isNegative ? `-${formattedAmount}` : formattedAmount;
}

/**
 * Backward-compatible helper for legacy components.
 */
export function formatMoney(amountMinor: number, currency: string = 'USD'): string {
  return formatMinorUnits(amountMinor, currency);
}
