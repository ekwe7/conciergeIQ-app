/**
 * RoomsPage — Screen UI-05 / UI-06 alias.
 * Renders StaysPage with live room inventory, occupancy stats, and guest check-in/out.
 */

import { deriveRoomOccupancyStatus } from '../features/rooms/components/RoomCardGrid';
import type { Room, Stay } from '../lib/api-types';
import { StaysPage } from './StaysPage';

/**
 * Backward-compatible alias for deriveRoomOccupancyStatus, preserved so
 * existing test files and imports continue to work without modification.
 */
export function occupancyOf(
  room: Room,
  stay: Stay | undefined,
  timeZone?: string,
  now = new Date(),
) {
  return deriveRoomOccupancyStatus(room, stay, timeZone, now);
}

export function RoomsPage() {
  return <StaysPage />;
}
