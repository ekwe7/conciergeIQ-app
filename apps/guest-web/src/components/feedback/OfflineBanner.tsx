import React from 'react';
import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from './useNetworkStatus';

export interface OfflineBannerProperties {
  className?: string;
  isOfflineOverride?: boolean;
}

/**
 * Sticky banner that slides into view whenever the guest device loses network connectivity.
 * Notifies the guest that their device is offline and will reconnect automatically.
 */
export const OfflineBanner: React.FC<OfflineBannerProperties> = ({
  className = '',
  isOfflineOverride,
}) => {
  const { isOnline } = useNetworkStatus();
  const effectiveIsOffline: boolean = isOfflineOverride ?? !isOnline;

  if (!effectiveIsOffline) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      data-testid="offline-banner"
      className={`sticky top-0 z-40 w-full bg-status-warning text-ink text-xs font-semibold px-4 py-2.5 flex items-center justify-center gap-2 shadow-elevation-low transition-transform duration-300 ease-out print:hidden ${className}`}
    >
      <WifiOff className="w-4 h-4 shrink-0 text-ink" aria-hidden="true" />
      <span>You are currently offline. Check your internet connection.</span>
    </aside>
  );
};
