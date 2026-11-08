import { AppApiError } from '@conciergeiq/utils';
import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a configured QueryClient with a 15-second refetch interval
 * for operational queries, window focus refetching, and idempotent retry policies.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchInterval: 15_000,
        refetchOnWindowFocus: true,
        retry: (failureCount: number, error: unknown) => {
          if (
            error instanceof AppApiError &&
            error.statusCode >= 400 &&
            error.statusCode < 500 &&
            error.statusCode !== 408
          ) {
            return false;
          }
          return failureCount < 2;
        },
      },
      // Operational commands like orders and check-ins must never be duplicated.
      mutations: { retry: false },
    },
  });
}
