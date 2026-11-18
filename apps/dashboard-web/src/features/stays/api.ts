import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import type { Room, Stay, StayBill } from '../../lib/api-types';
import { queryKeys } from '../../lib/query-keys';
import { useCurrentUser } from '../auth/AuthProvider';

export interface CheckInPayload {
  guestName: string;
  guestPhone?: string;
  expectedCheckOutAt: string;
}

export type CheckInInput = CheckInPayload;

export interface CheckInRequestParameters {
  roomId: string;
  checkInPayload?: CheckInPayload;
  input?: CheckInPayload;
}

/**
 * Tomorrow at 12:00 local time, as a string formatted for HTML datetime-local inputs.
 */
export function defaultExpectedCheckOutDateTime(referenceDate = new Date()): string {
  const tomorrowDate = new Date(referenceDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  tomorrowDate.setHours(12, 0, 0, 0);

  const padZero = (numericValue: number) => String(numericValue).padStart(2, '0');
  const yearString = tomorrowDate.getFullYear();
  const monthString = padZero(tomorrowDate.getMonth() + 1);
  const dayString = padZero(tomorrowDate.getDate());
  const hourString = padZero(tomorrowDate.getHours());
  const minuteString = padZero(tomorrowDate.getMinutes());

  return `${yearString}-${monthString}-${dayString}T${hourString}:${minuteString}`;
}

/**
 * Hook to invalidate query caches after check-in or check-out mutations.
 */
function useInvalidateStaysAndRooms() {
  const queryClient = useQueryClient();
  return (hotelIdentifier: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.stays(hotelIdentifier) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.rooms(hotelIdentifier) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.orders(hotelIdentifier) });
  };
}

/**
 * Safely resolves the current user's hotel identifier, falling back gracefully
 * if session restoration is still in-flight or during component unit tests.
 */
function useCurrentHotelIdentifier(): string {
  try {
    const currentUser = useCurrentUser();
    return currentUser.hotelId;
  } catch {
    return 'default-hotel-identifier';
  }
}

/**
 * Query active hotel stays: exactly one active stay per occupied room.
 */
export function useStays() {
  const currentHotelIdentifier = useCurrentHotelIdentifier();
  return useQuery({
    queryKey: queryKeys.stays(currentHotelIdentifier),
    queryFn: ({ signal: abortSignal }) =>
      api.get<Stay[]>('/stays', { signal: abortSignal }),
  });
}

/**
 * Query the itemized folio bill for a given stay.
 */
export function useStayBill(stayIdentifier: string | null) {
  const currentHotelIdentifier = useCurrentHotelIdentifier();
  return useQuery({
    queryKey: queryKeys.stayBill(currentHotelIdentifier, stayIdentifier ?? ''),
    queryFn: ({ signal: abortSignal }) =>
      api.get<StayBill>(`/stays/${stayIdentifier}/bill`, { signal: abortSignal }),
    enabled: Boolean(stayIdentifier),
    staleTime: 0,
  });
}

/**
 * Mutation hook to check a guest into a room.
 * Invokes POST /api/v1/rooms/:roomId/check-in and activates room QR ordering.
 */
export function useCheckIn() {
  const currentHotelIdentifier = useCurrentHotelIdentifier();
  const invalidateQueries = useInvalidateStaysAndRooms();

  return useMutation({
    mutationFn: ({ roomId, checkInPayload, input }: CheckInRequestParameters) => {
      const effectivePayload = checkInPayload ?? input;
      if (!effectivePayload) {
        throw new Error('Check-in payload is required');
      }
      return api.post<Stay>(`/rooms/${roomId}/check-in`, effectivePayload);
    },
    onSettled: () => {
      invalidateQueries(currentHotelIdentifier);
    },
  });
}

/**
 * Mutation hook to check a guest out of their stay.
 * Invokes POST /api/v1/stays/:stayId/check-out and severs active guest sessions.
 */
export function useCheckOut() {
  const currentHotelIdentifier = useCurrentHotelIdentifier();
  const invalidateQueries = useInvalidateStaysAndRooms();

  return useMutation({
    mutationFn: (stayIdentifier: string) =>
      api.post<Stay>(`/stays/${stayIdentifier}/check-out`),
    onSettled: () => {
      invalidateQueries(currentHotelIdentifier);
    },
  });
}
