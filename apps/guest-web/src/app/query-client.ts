import { QueryClient } from '@tanstack/react-query';

/**
 * Creates and configures a QueryClient instance optimized for mobile web devices.
 * Configures conservative caching, reduced retry attempts to conserve battery and data,
 * and suppresses automatic refetching on window focus.
 */
export function createMobileQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 3, // 3 minutes fresh cache window
        gcTime: 1000 * 60 * 15, // 15 minutes garbage collection time
        retry: (failureCount: number, error: unknown): boolean => {
          if (failureCount >= 2) {
            return false;
          }
          if (error instanceof Error && error.message.includes('404')) {
            return false;
          }
          return true;
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
      },
    },
  });
}

export const applicationQueryClient: QueryClient = createMobileQueryClient();
