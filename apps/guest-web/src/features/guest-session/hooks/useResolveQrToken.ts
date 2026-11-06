import { useState, useCallback, useRef } from 'react';
import { guestApiClient } from '../../../lib/api-client';
import { AppApiError } from '../../../lib/error-handler';
import {
  saveGuestSession,
  createSessionStateFromGuestSession,
} from '../session-store';
import { GuestSessionState, ResolveGuestSessionResponse } from '../types';

export interface UseResolveQrTokenOptions {
  onSuccessCallback?: (session: GuestSessionState) => void;
  onErrorCallback?: (error: AppApiError | Error) => void;
}

export interface UseResolveQrTokenResult {
  resolveQrToken: (qrToken: string) => Promise<GuestSessionState>;
  isResolving: boolean;
  resolveError: AppApiError | Error | null;
  resolvedSession: GuestSessionState | null;
  resetResolutionState: () => void;
}

/**
 * Removes the sensitive ?token= parameter from the browser URL address bar
 * without triggering a page reload.
 */
export function purgeTokenFromUrl(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.has('token')) {
      currentUrl.searchParams.delete('token');
      const sanitizedSearch = currentUrl.searchParams.toString();
      const cleanUrl = `${currentUrl.pathname}${sanitizedSearch.length > 0 ? `?${sanitizedSearch}` : ''}${currentUrl.hash}`;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  } catch {
    // Gracefully ignore URL parse errors in non-standard environments
  }
}

/**
 * Custom hook to exchange a room QR code token for a verified guest session.
 * Manages the mutation against POST /api/v1/guest/sessions, persists the session
 * into sessionStorage, and purges the raw token parameter from the browser URL bar.
 */
export function useResolveQrToken(
  options?: UseResolveQrTokenOptions
): UseResolveQrTokenResult {
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [resolveError, setResolveError] = useState<AppApiError | Error | null>(null);
  const [resolvedSession, setResolvedSession] = useState<GuestSessionState | null>(null);

  const optionsReference = useRef(options);
  optionsReference.current = options;

  const resetResolutionState = useCallback(() => {
    setIsResolving(false);
    setResolveError(null);
    setResolvedSession(null);
  }, []);

  const resolveQrToken = useCallback(
    async (qrToken: string): Promise<GuestSessionState> => {
      setIsResolving(true);
      setResolveError(null);

      try {
        const responseData = await guestApiClient.post<
          ResolveGuestSessionResponse,
          { qrToken: string }
        >('/api/v1/guest/sessions', { qrToken });

        const sessionState = createSessionStateFromGuestSession(responseData.session);

        // Persist to sessionStorage
        saveGuestSession(sessionState);

        // Purge sensitive token from URL
        purgeTokenFromUrl();

        setResolvedSession(sessionState);
        setIsResolving(false);

        if (optionsReference.current?.onSuccessCallback) {
          optionsReference.current.onSuccessCallback(sessionState);
        }

        return sessionState;
      } catch (caughtError: unknown) {
        setIsResolving(false);
        const resolvedError =
          caughtError instanceof Error
            ? caughtError
            : new Error('Failed to resolve room QR token.');

        setResolveError(resolvedError);

        if (optionsReference.current?.onErrorCallback) {
          optionsReference.current.onErrorCallback(resolvedError);
        }

        throw resolvedError;
      }
    },
    []
  );

  return {
    resolveQrToken,
    isResolving,
    resolveError,
    resolvedSession,
    resetResolutionState,
  };
}
