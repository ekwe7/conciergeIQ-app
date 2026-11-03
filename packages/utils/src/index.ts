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

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}
