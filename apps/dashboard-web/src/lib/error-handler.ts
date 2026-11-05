import { AppApiError } from '@conciergeiq/utils';

/**
 * Turns any thrown value into a sentence a member of staff can act on.
 * Business-rule messages from the API (400/409) are written for people, so
 * they are shown as they are; everything else gets a safe, generic message.
 */
export function describeError(error: unknown): string {
  if (!(error instanceof AppApiError)) return 'Something went wrong. Try again.';

  switch (error.statusCode) {
    case 0:
    case 408:
      return 'Cannot reach the server. Check the connection and try again.';
    case 400:
    case 409:
    case 422:
      return error.message;
    case 401:
      return 'Your session has ended. Sign in again.';
    case 403:
      return 'Your role does not allow this.';
    case 404:
      return 'This record no longer exists. It may have been removed.';
    case 429:
      return 'Too many attempts. Wait a minute and try again.';
    default:
      return 'Something went wrong on our side. Try again.';
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof AppApiError && error.statusCode === 404;
}
