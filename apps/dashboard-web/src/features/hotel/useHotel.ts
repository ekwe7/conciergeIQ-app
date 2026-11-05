import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import type { Hotel } from '../../lib/api-types';
import { queryKeys } from '../../lib/query-keys';
import { useCurrentUser } from '../auth/AuthProvider';

export function useHotel() {
  const { hotelId } = useCurrentUser();
  return useQuery({
    queryKey: queryKeys.hotel(hotelId),
    queryFn: ({ signal }) => api.get<Hotel>('/hotel', { signal }),
    staleTime: 5 * 60_000,
  });
}

/** Currency and time zone for formatting, with safe defaults while loading. */
export function useHotelLocale(): { currency: string; timeZone: string | undefined } {
  const { data } = useHotel();
  return { currency: data?.currency ?? 'NGN', timeZone: data?.timezone };
}
