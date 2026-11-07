import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ToastProvider } from '../components/ui/Toast';
import { AuthProvider } from '../features/auth/AuthProvider';
import { createQueryClient } from './query-client';

export interface ApplicationProvidersProperties {
  children: ReactNode;
  queryClient?: QueryClient;
}

/**
 * Root application providers wrapper for the dashboard web application.
 * Configures TanStack QueryClientProvider with operational polling,
 * authentication context, and toast notifications.
 */
export function AppProviders({
  children,
  queryClient,
}: ApplicationProvidersProperties) {
  const [activeQueryClient] = useState<QueryClient>(
    () => queryClient ?? createQueryClient(),
  );

  return (
    <QueryClientProvider client={activeQueryClient}>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export { AppProviders as ApplicationProviders };
