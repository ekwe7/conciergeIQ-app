import { GuestSession } from '@conciergeiq/contracts';
import { GuestSessionState } from './types';

export const GUEST_SESSION_STORAGE_KEY: string = 'conciergeiq_guest_session';
export const GUEST_SESSION_CHANGE_EVENT_NAME: string = 'conciergeiq_guest_session_change';

/**
 * Validates whether an unknown object satisfies the GuestSessionState contract.
 */
export function validateSessionState(candidateSession: unknown): candidateSession is GuestSessionState {
  if (!candidateSession || typeof candidateSession !== 'object') {
    return false;
  }

  const potentialSession = candidateSession as Partial<GuestSessionState>;

  return (
    typeof potentialSession.sessionToken === 'string' &&
    potentialSession.sessionToken.length > 0 &&
    typeof potentialSession.roomNumber === 'string' &&
    potentialSession.roomNumber.length > 0 &&
    typeof potentialSession.hotelId === 'string' &&
    potentialSession.hotelId.length > 0 &&
    typeof potentialSession.hotelName === 'string' &&
    potentialSession.hotelName.length > 0 &&
    typeof potentialSession.stayId === 'string' &&
    potentialSession.stayId.length > 0 &&
    typeof potentialSession.expiresAt === 'string' &&
    potentialSession.expiresAt.length > 0
  );
}

/**
 * Converts a backend GuestSession response object into a normalized GuestSessionState.
 */
export function createSessionStateFromGuestSession(
  guestSession: GuestSession
): GuestSessionState {
  return {
    sessionToken: guestSession.token,
    sessionId: guestSession.stayId,
    hotelId: guestSession.hotelId,
    hotelName: guestSession.hotelName,
    roomId: guestSession.roomNumber,
    roomNumber: guestSession.roomNumber,
    stayId: guestSession.stayId,
    guestName: guestSession.guestName || 'Valued Guest',
    expiresAt: guestSession.expiresAt,
  };
}

/**
 * Checks whether the expiration date on the session has passed.
 */
export function isSessionExpired(sessionState: GuestSessionState): boolean {
  try {
    const expirationTimeMilliseconds = new Date(sessionState.expiresAt).getTime();
    if (Number.isNaN(expirationTimeMilliseconds)) {
      return true;
    }
    return Date.now() >= expirationTimeMilliseconds;
  } catch {
    return true;
  }
}

/**
 * Saves guest session claims to browser sessionStorage.
 * Dispatches a change event so UI subscribers can synchronize.
 */
export function saveGuestSession(sessionState: GuestSessionState): void {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }

  window.sessionStorage.setItem(
    GUEST_SESSION_STORAGE_KEY,
    JSON.stringify(sessionState)
  );

  window.dispatchEvent(
    new CustomEvent(GUEST_SESSION_CHANGE_EVENT_NAME, {
      detail: sessionState,
    })
  );
}

/**
 * Retrieves the persisted guest session from browser sessionStorage.
 * Clears and discards the session if expired or malformed.
 */
export function retrieveGuestSession(): GuestSessionState | null {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return null;
  }

  const serializedSession = window.sessionStorage.getItem(GUEST_SESSION_STORAGE_KEY);
  if (!serializedSession) {
    return null;
  }

  try {
    const parsedSession: unknown = JSON.parse(serializedSession);
    if (!validateSessionState(parsedSession)) {
      clearGuestSession();
      return null;
    }

    if (isSessionExpired(parsedSession)) {
      clearGuestSession();
      return null;
    }

    return parsedSession;
  } catch {
    clearGuestSession();
    return null;
  }
}

/**
 * Clears the active guest session from browser sessionStorage.
 */
export function clearGuestSession(): void {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }

  window.sessionStorage.removeItem(GUEST_SESSION_STORAGE_KEY);

  window.dispatchEvent(
    new CustomEvent(GUEST_SESSION_CHANGE_EVENT_NAME, {
      detail: null,
    })
  );
}

/**
 * Checks whether an unexpired valid guest session is currently persisted.
 */
export function hasActiveGuestSession(): boolean {
  return retrieveGuestSession() !== null;
}
