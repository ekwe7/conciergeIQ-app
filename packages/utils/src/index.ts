export {
  formatMinorUnits,
  formatMoney,
} from './money';

export {
  isValidIsoDate,
  formatIsoTimestamp,
  formatTimeOnly,
  formatDateOnly,
  formatRelativeTime,
  formatDate,
} from './date';

export {
  AppApiError,
  normalizeApiError,
  type Rfc7807ProblemDetails,
  type CanonicalApiErrorCode,
} from './error-handler';

export {
  createApiClient,
  type ApiClient,
  type ApiClientConfiguration,
  type ApiRequestOptions,
} from './api-client';
export function formatMoney(amountMinor: number, currency: string = 'USD'): string {
  const major = amountMinor / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(major);
}

export function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoDate;
  }
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}
