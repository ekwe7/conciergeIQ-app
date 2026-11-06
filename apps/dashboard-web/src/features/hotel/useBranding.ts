import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import type { HotelBranding, Language } from '../../lib/api-types';
import { queryKeys } from '../../lib/query-keys';
import { useCurrentUser } from '../auth/AuthProvider';

export function useBranding() {
  const { hotelId } = useCurrentUser();
  return useQuery({
    queryKey: queryKeys.branding(hotelId),
    queryFn: ({ signal }) => api.get<HotelBranding>('/hotel/branding', { signal }),
    staleTime: 5 * 60_000,
  });
}

/** Languages guests can switch to, other than English: the ones menu translations are needed for. */
export function useTranslatedLanguages(): Exclude<Language, 'en'>[] {
  const { data } = useBranding();
  return (data?.languages ?? []).filter((language): language is Exclude<Language, 'en'> => language !== 'en');
}
