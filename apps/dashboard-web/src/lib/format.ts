import type { OrderLine, PaymentMethod } from './api-types';

/** `A-1042`, the way staff and guests refer to an order. */
export const formatOrderNumber = (orderNumber: number): string => `A-${orderNumber}`;

/**
 * Formats an API amount (decimal major units) in the hotel's currency.
 * Whole amounts drop the decimals: ₦9,100 rather than ₦9,100.00.
 */
export function formatAmount(amount: number, currency = 'NGN'): string {
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(whole ? 0 : 2)}`;
  }
}

/** "Free" reads better than ₦0 for towels and toiletries. */
export const formatCharge = (amount: number, currency?: string): string =>
  amount === 0 ? 'Free' : formatAmount(amount, currency);

/** Elapsed time since `iso`: "just now", "8 min", "1 h", "2 d". */
export function formatAge(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

/** A running clock for orders still waiting: "2:41". */
export function formatWaiting(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  if (minutes >= 60) return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

/** A duration in milliseconds as "1 min 52 s". */
export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} s`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
}

function formatIn(iso: string, timeZone: string | undefined, options: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { ...options, timeZone }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat('en-GB', options).format(new Date(iso));
  }
}

/** "19:38" in the hotel's time zone. */
export const formatClock = (iso: string, timeZone?: string): string =>
  formatIn(iso, timeZone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** "22 Oct". */
export const formatDay = (iso: string, timeZone?: string): string =>
  formatIn(iso, timeZone, { day: 'numeric', month: 'short' });

/** "22 Oct, 19:38". */
export const formatDateTime = (iso: string, timeZone?: string): string =>
  formatIn(iso, timeZone, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** True when `iso` falls on the same calendar day as `now` in the hotel's time zone. */
export function isSameDay(iso: string, timeZone?: string, now = new Date()): boolean {
  const key = (value: Date) => formatIn(value.toISOString(), timeZone, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return key(new Date(iso)) === key(now);
}

/** "Jollof rice ×2 · Chapman". */
export const summarizeItems = (items: Pick<OrderLine, 'name' | 'quantity'>[]): string =>
  items.map((item) => (item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name)).join(' · ');

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  TRANSFER: 'Transfer',
};

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
