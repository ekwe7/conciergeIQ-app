import { AppApiError, createApiClient, type ApiRequestOptions } from '@conciergeiq/utils';
import type { AuthTokenResponse } from './api-types';
import { config } from './config';
import { session } from './session';

const http = createApiClient({
  baseURL: config.apiBaseUrl,
  getToken: () => session.getAccessToken(),
});

let refreshInFlight: Promise<AuthTokenResponse | null> | null = null;

/**
 * Exchanges the stored refresh token for new tokens. Concurrent callers share
 * one request, because the refresh token is single-use: a second request with
 * the same token would be treated as reuse and end every session.
 */
export function refreshSession(): Promise<AuthTokenResponse | null> {
  const refreshToken = session.getRefreshToken();
  if (!refreshToken) return Promise.resolve(null);

  refreshInFlight ??= http
    .post<AuthTokenResponse>('/auth/refresh', { refreshToken })
    .then((tokens) => {
      session.store(tokens);
      return tokens;
    })
    .catch((error: unknown) => {
      // Only a rejected token ends the session; a network blip does not.
      if (error instanceof AppApiError && error.statusCode === 401) session.clear();
      return null;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

async function withRefresh<T>(send: () => Promise<T>): Promise<T> {
  try {
    return await send();
  } catch (error) {
    if (!(error instanceof AppApiError) || error.statusCode !== 401 || !session.getRefreshToken()) throw error;
    const tokens = await refreshSession();
    if (!tokens) {
      session.expire();
      throw error;
    }
    return send();
  }
}

export interface QueryParams {
  [key: string]: string | number | boolean | undefined | null;
}

export function withQuery(path: string, params: QueryParams = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

/** The dashboard's API client: adds the access token and renews it once on a 401. */
export const api = {
  get: <T>(path: string, options?: ApiRequestOptions) => withRefresh(() => http.get<T>(path, options)),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    withRefresh(() => http.post<T>(path, body, options)),
  patch: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    withRefresh(() => http.patch<T>(path, body, options)),
  put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) => withRefresh(() => http.put<T>(path, body, options)),
  delete: <T>(path: string, options?: ApiRequestOptions) => withRefresh(() => http.delete<T>(path, options)),
  getBlob: (path: string, options?: ApiRequestOptions) => withRefresh(() => http.getBlob(path, options)),
  /** Sign-in and sign-out never retry with a refreshed token. */
  unauthenticated: http,
};

/** Saves a downloaded file, e.g. the QR code PDF or the activity CSV. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
