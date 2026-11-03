import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { applicationQueryClient } from './query-client';

export interface ApplicationProvidersProperties {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

/**
 * Root providers wrapper for the guest web application.
 * Injects QueryClientProvider with mobile-optimized defaults.
 */
export const ApplicationProviders: React.FC<ApplicationProvidersProperties> = ({
  children,
  queryClient = applicationQueryClient,
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
