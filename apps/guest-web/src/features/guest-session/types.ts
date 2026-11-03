import { GuestSession } from '@conciergeiq/contracts';

/**
 * Persisted guest session claims stored securely in sessionStorage.
 */
export interface GuestSessionState {
  sessionToken: string;
  sessionId: string;
  hotelId: string;
  hotelName: string;
  roomId: string;
  roomNumber: string;
  stayId: string;
  guestName: string;
  expiresAt: string;
}

/**
 * Request payload sent to POST /api/v1/guest/sessions.
 */
export interface ResolveGuestSessionPayload {
  qrToken: string;
}

/**
 * Backend response shape from POST /api/v1/guest/sessions.
 */
export interface ResolveGuestSessionResponse {
  session: GuestSession;
}
