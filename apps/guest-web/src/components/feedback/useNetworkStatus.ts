import { useState, useEffect, useCallback } from 'react';

export interface UseNetworkStatusResult {
  isOnline: boolean;
}

/**
 * Hook that detects browser network connectivity by listening to window online and offline events.
 *
 * Defaults to true if navigator is not defined (e.g. server-side or preliminary render),
 * and updates dynamically when the network status changes.
 */
export function useNetworkStatus(): UseNetworkStatusResult {
  const getInitialOnlineStatus = (): boolean => {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  };

  const [isOnline, setIsOnline] = useState<boolean>(getInitialOnlineStatus);

  const handleOnlineEvent = useCallback(() => {
    setIsOnline(true);
  }, []);

  const handleOfflineEvent = useCallback(() => {
    setIsOnline(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', handleOnlineEvent);
    window.addEventListener('offline', handleOfflineEvent);

    return () => {
      window.removeEventListener('online', handleOnlineEvent);
      window.removeEventListener('offline', handleOfflineEvent);
    };
  }, [handleOnlineEvent, handleOfflineEvent]);

  return { isOnline };
}
