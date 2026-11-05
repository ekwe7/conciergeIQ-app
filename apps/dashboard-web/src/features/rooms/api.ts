import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import type { Room, Stay, StayBill } from '../../lib/api-types';
import { queryKeys } from '../../lib/query-keys';
import { useCurrentUser } from '../auth/AuthProvider';

const byRoomNumber = (a: Room, b: Room) =>
  a.floor - b.floor || a.number.localeCompare(b.number, undefined, { numeric: true });

export function useRooms() {
  const { hotelId } = useCurrentUser();
  return useQuery({
    queryKey: queryKeys.rooms(hotelId),
    queryFn: async ({ signal }) => (await api.get<Room[]>('/rooms', { signal })).sort(byRoomNumber),
  });
}

/** Active stays only: one per occupied room. */
export function useStays() {
  const { hotelId } = useCurrentUser();
  return useQuery({
    queryKey: queryKeys.stays(hotelId),
    queryFn: ({ signal }) => api.get<Stay[]>('/stays', { signal }),
  });
}

export function useStayBill(stayId: string | null) {
  const { hotelId } = useCurrentUser();
  return useQuery({
    queryKey: queryKeys.stayBill(hotelId, stayId ?? ''),
    queryFn: ({ signal }) => api.get<StayBill>(`/stays/${stayId}/bill`, { signal }),
    enabled: Boolean(stayId),
    staleTime: 0,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return (...keys: (readonly unknown[])[]) => keys.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }));
}

export interface CheckInInput {
  guestName: string;
  guestPhone?: string;
  expectedCheckOutAt: string;
}

export function useCheckIn() {
  const { hotelId } = useCurrentUser();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ roomId, input }: { roomId: string; input: CheckInInput }) =>
      api.post<Stay>(`/rooms/${roomId}/check-in`, input),
    onSettled: () => invalidate(queryKeys.stays(hotelId), queryKeys.rooms(hotelId)),
  });
}

export function useCheckOut() {
  const { hotelId } = useCurrentUser();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (stayId: string) => api.post<Stay>(`/stays/${stayId}/check-out`),
    onSettled: () => invalidate(queryKeys.stays(hotelId), queryKeys.rooms(hotelId)),
  });
}

export interface RoomInput {
  number: string;
  floor: number;
}

export function useCreateRooms() {
  const { hotelId } = useCurrentUser();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (rooms: RoomInput[]) =>
      rooms.length === 1 ? api.post<Room>('/rooms', rooms[0]).then((room) => [room]) : api.post<Room[]>('/rooms/bulk', { rooms }),
    onSettled: () => invalidate(queryKeys.rooms(hotelId)),
  });
}

export interface RoomUpdate {
  number?: string;
  floor?: number;
  isOutOfOrder?: boolean;
  outOfOrderReason?: string | null;
}

export function useUpdateRoom() {
  const { hotelId } = useCurrentUser();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ roomId, update }: { roomId: string; update: RoomUpdate }) => api.patch<Room>(`/rooms/${roomId}`, update),
    onSettled: () => invalidate(queryKeys.rooms(hotelId)),
  });
}

/** Issues new QR codes. The old printed cards stop working at once. */
export function useRegenerateQrCodes() {
  const { hotelId } = useCurrentUser();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (roomIds: string[]) =>
      roomIds.length === 1
        ? api.post<Room>(`/rooms/${roomIds[0]}/qr/regenerate`).then((room) => [room])
        : api.post<Room[]>('/rooms/qr/regenerate', { roomIds }),
    onSettled: () => invalidate(queryKeys.rooms(hotelId)),
  });
}
