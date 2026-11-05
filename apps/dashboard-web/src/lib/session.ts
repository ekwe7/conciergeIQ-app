import type { AuthTokenResponse } from './api-types';

/**
 * Where the dashboard keeps its tokens.
 *
 * - The access token (15 min) lives only in memory.
 * - The refresh token is single-use and rotates on every refresh. It is kept in
 *   sessionStorage so a page reload keeps the user signed in, while closing the
 *   tab ends the session. It never goes to localStorage.
 */
const REFRESH_TOKEN_KEY = 'conciergeiq.dashboard.refreshToken';

type ExpiryListener = () => void;

let accessToken: string | null = null;
const expiryListeners = new Set<ExpiryListener>();

function readStorage(): string | null {
  try {
    return window.sessionStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeStorage(value: string | null): void {
  try {
    if (value) window.sessionStorage.setItem(REFRESH_TOKEN_KEY, value);
    else window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Storage blocked: the session still works until the tab reloads.
  }
}

let refreshToken: string | null = readStorage();

export const session = {
  getAccessToken: (): string | null => accessToken,
  getRefreshToken: (): string | null => refreshToken,

  store(tokens: Pick<AuthTokenResponse, 'accessToken' | 'refreshToken'>): void {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    writeStorage(tokens.refreshToken);
  },

  clear(): void {
    accessToken = null;
    refreshToken = null;
    writeStorage(null);
  },

  /** Clears the tokens and tells the app the user has to sign in again. */
  expire(): void {
    session.clear();
    expiryListeners.forEach((listener) => listener());
  },

  onExpired(listener: ExpiryListener): () => void {
    expiryListeners.add(listener);
    return () => expiryListeners.delete(listener);
  },
};
