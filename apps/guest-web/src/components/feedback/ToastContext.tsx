import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastNotification {
  identifier: string;
  title: string;
  message: string;
  variant: ToastVariant;
  durationMilliseconds?: number;
  action?: ToastAction;
  orderIdentifier?: string;
  timestamp: number;
}

export interface ShowToastOptions {
  title: string;
  message: string;
  variant?: ToastVariant;
  durationMilliseconds?: number;
  action?: ToastAction;
  orderIdentifier?: string;
}

export interface ToastContextValue {
  toastsList: ToastNotification[];
  showToast: (options: ShowToastOptions) => string;
  dismissToast: (toastIdentifier: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const defaultToastContextValue: ToastContextValue = {
  toastsList: [],
  showToast: () => '',
  dismissToast: () => {},
  clearAllToasts: () => {},
};

export const DEFAULT_TOAST_DURATION_MILLISECONDS: number = 4000;

export interface ToastProviderProperties {
  children: React.ReactNode;
  defaultDurationMilliseconds?: number;
}

/**
 * Toast Provider managing the active stack of ephemeral in-app notifications.
 */
export const ToastProvider: React.FC<ToastProviderProperties> = ({
  children,
  defaultDurationMilliseconds = DEFAULT_TOAST_DURATION_MILLISECONDS,
}) => {
  const [toastsList, setToastsList] = useState<ToastNotification[]>([]);

  const dismissToast = useCallback((toastIdentifier: string) => {
    setToastsList((previousToasts) =>
      previousToasts.filter((candidateToast) => candidateToast.identifier !== toastIdentifier)
    );
  }, []);

  const clearAllToasts = useCallback(() => {
    setToastsList([]);
  }, []);

  const showToast = useCallback(
    (options: ShowToastOptions): string => {
      const generatedIdentifier: string = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const newToastRecord: ToastNotification = {
        identifier: generatedIdentifier,
        title: options.title,
        message: options.message,
        variant: options.variant ?? 'info',
        durationMilliseconds: options.durationMilliseconds ?? defaultDurationMilliseconds,
        action: options.action,
        orderIdentifier: options.orderIdentifier,
        timestamp: Date.now(),
      };

      setToastsList((previousToasts) => {
        // Keep maximum of 3 concurrent active toasts to prevent viewport clutter
        const filteredToasts = previousToasts.slice(-2);
        return [...filteredToasts, newToastRecord];
      });

      return generatedIdentifier;
    },
    [defaultDurationMilliseconds]
  );

  const contextValue = useMemo<ToastContextValue>(() => {
    return {
      toastsList,
      showToast,
      dismissToast,
      clearAllToasts,
    };
  }, [toastsList, showToast, dismissToast, clearAllToasts]);

  return <ToastContext.Provider value={contextValue}>{children}</ToastContext.Provider>;
};

/**
 * Hook to trigger and dismiss ephemeral toast notifications from any component.
 */
export function useToast(): ToastContextValue {
  const resolvedContext = useContext(ToastContext);
  return resolvedContext ?? defaultToastContextValue;
}
