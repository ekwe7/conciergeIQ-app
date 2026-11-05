import { AppApiError } from '@conciergeiq/utils';
import { QueryClient } from '@tanstack/react-query';

/** Retries reads on network and server errors only; a 4xx will not change on retry. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          if (error instanceof AppApiError && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 408) {
            return false;
          }
          return failureCount < 2;
        },
      },
      // Orders, payments and check-ins must never be sent twice by accident.
      mutations: { retry: false },
    },
  });
}
