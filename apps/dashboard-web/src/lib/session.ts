import type { AuthTokenResponse } from './api-types';

/**
 * Where the dashboard keeps its tokens.
 *
 * - The access token (15 min TTL) lives only in module-level memory — never in
 *   any browser storage — to minimise XSS exposure.
 * - The refresh token is single-use and rotates on every refresh. It is stored
 *   in `localStorage` so a page reload (or reopening the browser) keeps the
 *   staff member signed in for the token's 7-day lifetime.  If the user opts
 *   out of persistence ("Keep me signed in" toggle OFF), the token is kept only
 *   in memory and is cleared when writeStorage is called with null.
 */
const REFRESH_TOKEN_STORAGE_KEY = 'conciergeiq.dashboard.refreshToken';

type SessionExpiryListener = () => void;

/** In-memory access token; never touches browser storage. */
let currentAccessToken: string | null = null;

/** In-memory refresh token; also mirrored to localStorage when persistence is enabled. */
let currentRefreshToken: string | null = null;

/** Listeners notified when the session expires due to a failed token refresh. */
const sessionExpiryListeners = new Set<SessionExpiryListener>();

/** Reads the persisted refresh token from localStorage, returning null on any error. */
function readRefreshTokenFromStorage(): string | null {
  try {
    return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    // localStorage may be blocked (private browsing, storage quota, etc.)
    return null;
  }
}

/** Writes or removes the refresh token in localStorage, silently ignoring storage errors. */
function writeRefreshTokenToStorage(refreshTokenValue: string | null): void {
  try {
    if (refreshTokenValue) {
      window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshTokenValue);
    } else {
      window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Storage blocked: the in-memory session still works until the tab reloads.
  }
}

// Initialise from localStorage so a page reload automatically resumes the session.
currentRefreshToken = readRefreshTokenFromStorage();

export const session = {
  /** Returns the current access token (memory-only, 15-minute TTL). */
  getAccessToken(): string | null {
    return currentAccessToken;
  },

  /** Returns the current refresh token (also persisted in localStorage if `store` was called with `persistToLocalStorage = true`). */
  getRefreshToken(): string | null {
    return currentRefreshToken;
  },

  /**
   * Saves a received token pair.
   *
   * @param tokens - The access and refresh tokens returned by login or refresh.
   * @param persistToLocalStorage - When `true` (default), the refresh token is
   *   written to localStorage so the session survives a page reload.  Pass
   *   `false` for a "this tab only" session (e.g. when the user unchecked
   *   "Keep me signed in on this device").
   */
  store(
    tokens: Pick<AuthTokenResponse, 'accessToken' | 'refreshToken'>,
    persistToLocalStorage: boolean = true,
  ): void {
    currentAccessToken = tokens.accessToken;
    currentRefreshToken = tokens.refreshToken;
    if (persistToLocalStorage) {
      writeRefreshTokenToStorage(tokens.refreshToken);
    } else {
      // Clear any previously persisted token so a reload does not resurrect the session.
      writeRefreshTokenToStorage(null);
    }
  },

  /** Removes all tokens from memory and localStorage. */
  clear(): void {
    currentAccessToken = null;
    currentRefreshToken = null;
    writeRefreshTokenToStorage(null);
  },

  /**
   * Clears all tokens and notifies the application that the session has expired.
   * Called when a token refresh attempt returns 401 (token revoked or expired).
   */
  expire(): void {
    session.clear();
    sessionExpiryListeners.forEach((listener) => listener());
  },

  /**
   * Registers a listener that is called when the session expires unexpectedly.
   * Returns a cleanup function that unregisters the listener.
   */
  onExpired(listener: SessionExpiryListener): () => void {
    sessionExpiryListeners.add(listener);
    return () => sessionExpiryListeners.delete(listener);
  },
};
