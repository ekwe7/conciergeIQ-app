import React from 'react';
import { useToast } from './ToastContext';
import { ToastItem } from './ToastItem';

export interface ToastContainerProperties {
  className?: string;
}

/**
 * Top-anchored stack of ephemeral notifications.
 *
 * The polite live region is always mounted (even when empty) so screen readers reliably
 * announce toasts as they are inserted. Hidden when printing.
 */
export const ToastContainer: React.FC<ToastContainerProperties> = ({ className = '' }) => {
  const { toastsList, dismissToast } = useToast();

  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      aria-relevant="additions"
      data-testid="guest-toast-container"
      className={`fixed top-0 inset-x-0 z-50 pointer-events-none px-3.5 pt-3.5 space-y-2.5 max-w-md mx-auto padding-top-safe-area print:hidden ${className}`}
    >
      {toastsList.map((notificationRecord) => (
        <ToastItem
          key={notificationRecord.identifier}
          notification={notificationRecord}
          onDismiss={dismissToast}
        />
      ))}
    </div>
  );
};
