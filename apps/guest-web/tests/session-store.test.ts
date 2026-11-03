import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveGuestSession,
  retrieveGuestSession,
  clearGuestSession,
  hasActiveGuestSession,
  isSessionExpired,
  validateSessionState,
  createSessionStateFromGuestSession,
  GUEST_SESSION_STORAGE_KEY,
} from '../src/features/guest-session/session-store';
import { GuestSessionState } from '../src/features/guest-session/types';
import { GuestSession } from '@conciergeiq/contracts';

describe('Guest Session Store Lifecycle Suite', () => {
  const sampleValidSessionState: GuestSessionState = {
    sessionToken: 'jwt_sample_token_abc123',
    sessionId: 'stay_9921',
    hotelId: 'htl_lagos_grand',
    hotelName: 'The Lagos Grand Hotel & Suites',
    roomId: '402',
    roomNumber: '402',
    stayId: 'stay_9921',
    guestName: 'Adeola Johnson',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours in future
  };

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('saves and retrieves an active guest session successfully', () => {
    expect(hasActiveGuestSession()).toBe(false);
    expect(retrieveGuestSession()).toBeNull();

    saveGuestSession(sampleValidSessionState);

    expect(hasActiveGuestSession()).toBe(true);
    const retrievedSession = retrieveGuestSession();
    expect(retrievedSession).not.toBeNull();
    expect(retrievedSession?.roomNumber).toBe('402');
    expect(retrievedSession?.hotelName).toBe('The Lagos Grand Hotel & Suites');
    expect(retrievedSession?.sessionToken).toBe('jwt_sample_token_abc123');
  });

  it('clears active session from sessionStorage', () => {
    saveGuestSession(sampleValidSessionState);
    expect(hasActiveGuestSession()).toBe(true);

    clearGuestSession();

    expect(hasActiveGuestSession()).toBe(false);
    expect(retrieveGuestSession()).toBeNull();
    expect(window.sessionStorage.getItem(GUEST_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('identifies and purges expired guest sessions automatically', () => {
    const expiredSessionState: GuestSessionState = {
      ...sampleValidSessionState,
      expiresAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 minutes ago
    };

    expect(isSessionExpired(expiredSessionState)).toBe(true);

    // Save directly to sessionStorage
    window.sessionStorage.setItem(
      GUEST_SESSION_STORAGE_KEY,
      JSON.stringify(expiredSessionState)
    );

    // Retrieval should detect expiration and clear it
    const result = retrieveGuestSession();
    expect(result).toBeNull();
    expect(hasActiveGuestSession()).toBe(false);
  });

  it('validates correct session shapes and rejects malformed objects', () => {
    expect(validateSessionState(sampleValidSessionState)).toBe(true);
    expect(validateSessionState(null)).toBe(false);
    expect(validateSessionState({})).toBe(false);
    expect(validateSessionState({ sessionToken: 'abc' })).toBe(false);
    expect(
      validateSessionState({
        sessionToken: 'token',
        roomNumber: '101',
        hotelId: 'hotel1',
        hotelName: 'Grand Hotel',
        stayId: 'stay1',
        // missing expiresAt
      })
    ).toBe(false);
  });

  it('creates normalized session state from contract GuestSession object', () => {
    const backendGuestSession: GuestSession = {
      token: 'jwt_backend_token_7788',
      roomNumber: '501',
      stayId: 'stay_501',
      hotelId: 'htl_azure_bay',
      hotelName: 'Azure Bay Hotel',
      guestName: 'Emmanuel Ekwe',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    };

    const normalizedSessionState = createSessionStateFromGuestSession(backendGuestSession);

    expect(normalizedSessionState.sessionToken).toBe('jwt_backend_token_7788');
    expect(normalizedSessionState.roomNumber).toBe('501');
    expect(normalizedSessionState.guestName).toBe('Emmanuel Ekwe');
    expect(normalizedSessionState.hotelName).toBe('Azure Bay Hotel');
  });
});
