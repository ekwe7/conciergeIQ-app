/**
 * Date and time formatting utilities for ISO 8601 timestamps.
 */

/**
 * Checks if a given string is a valid ISO 8601 date string.
 */
export function isValidIsoDate(isoDateString: string): boolean {
  if (typeof isoDateString !== 'string' || isoDateString.trim() === '') {
    return false;
  }
  const parsedTimestamp = Date.parse(isoDateString);
  return !Number.isNaN(parsedTimestamp);
}

/**
 * Formats an ISO 8601 timestamp into a readable date and time string.
 * Example: '2026-11-02T19:30:00.000Z' -> 'Nov 2, 2026, 7:30 PM'
 */
export function formatIsoTimestamp(isoDateString: string): string {
  if (!isValidIsoDate(isoDateString)) {
    return isoDateString;
  }

  const dateObject = new Date(isoDateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(dateObject);
}

/**
 * Extracts and formats only the time from an ISO 8601 timestamp.
 * Example: '2026-11-02T19:30:00.000Z' -> '7:30 PM'
 */
export function formatTimeOnly(isoDateString: string): string {
  if (!isValidIsoDate(isoDateString)) {
    return isoDateString;
  }

  const dateObject = new Date(isoDateString);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(dateObject);
}

/**
 * Extracts and formats only the date from an ISO 8601 timestamp.
 * Example: '2026-11-02T19:30:00.000Z' -> 'Nov 2, 2026'
 */
export function formatDateOnly(isoDateString: string): string {
  if (!isValidIsoDate(isoDateString)) {
    return isoDateString;
  }

  const dateObject = new Date(isoDateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(dateObject);
}

/**
 * Computes a human-readable relative time string from an ISO 8601 timestamp.
 * Example: 'just now', '5m ago', '2h ago', '3d ago'.
 */
export function formatRelativeTime(
  isoDateString: string,
  referenceTimestampMilliseconds: number = Date.now()
): string {
  if (!isValidIsoDate(isoDateString)) {
    return isoDateString;
  }

  const targetTimestampMilliseconds = new Date(isoDateString).getTime();
  const elapsedDifferenceMilliseconds = referenceTimestampMilliseconds - targetTimestampMilliseconds;

  if (elapsedDifferenceMilliseconds < 0) {
    return 'in the future';
  }

  const elapsedSeconds = Math.floor(elapsedDifferenceMilliseconds / 1000);
  if (elapsedSeconds < 60) {
    return 'just now';
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}d ago`;
}

/**
 * Backward-compatible helper for legacy components.
 */
export function formatDate(isoDate: string): string {
  return formatTimeOnly(isoDate);
}
