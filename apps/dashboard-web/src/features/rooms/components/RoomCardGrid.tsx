/**
 * RoomCardGrid — Displays hotel rooms as a responsive grid of cards, each
 * showing the room number, floor, occupancy status badge, and contextual
 * action buttons for checking guests in or out.
 *
 * Floor filtering is handled via the `selectedFloorFilter` prop so the parent
 * page controls the active tab while this component stays pure and testable.
 */

import { useMemo } from 'react';
import { Button } from '../../../components/ui/Button';
import { EmptyState, Panel } from '../../../components/ui/Page';
import { Segmented } from '../../../components/ui/Segmented';
import { StatusLabel } from '../../../components/ui/Status';
import { formatDay, isSameDay } from '../../../lib/format';
import type { Room, Stay } from '../../../lib/api-types';

/** The four occupancy states a room can be in at any given moment. */
export type RoomOccupancyStatus = 'occupied' | 'due-out' | 'vacant' | 'out-of-order';

/** Display metadata for each occupancy status. */
const OCCUPANCY_DISPLAY: Record<
  RoomOccupancyStatus,
  { label: string; tone: 'done' | 'pending' | 'neutral' | 'void' }
> = {
  occupied: { label: 'Occupied', tone: 'done' },
  'due-out': { label: 'Due out', tone: 'pending' },
  vacant: { label: 'Vacant', tone: 'neutral' },
  'out-of-order': { label: 'Out of order', tone: 'void' },
};

/**
 * Derives the occupancy status of a room from its stay and time context.
 *
 * A room with an active stay is 'due-out' when the expected checkout time is
 * today or in the past; otherwise it is 'occupied'. A room without an active
 * stay is 'out-of-order' if flagged, otherwise 'vacant'.
 */
export function deriveRoomOccupancyStatus(
  room: Room,
  activeStay: Stay | undefined,
  hotelTimeZone?: string,
  currentTime = new Date(),
): RoomOccupancyStatus {
  if (activeStay) {
    const checkoutIsPastDue = new Date(activeStay.expectedCheckOutAt) <= currentTime;
    const checkoutIsToday = isSameDay(activeStay.expectedCheckOutAt, hotelTimeZone, currentTime);
    return checkoutIsPastDue || checkoutIsToday ? 'due-out' : 'occupied';
  }
  return room.isOutOfOrder ? 'out-of-order' : 'vacant';
}

export interface RoomCardGridProps {
  /** All rooms sorted by floor then by room number. */
  allRooms: Room[];
  /** Currently active stays keyed by room id. */
  stayByRoomId: Map<string, Stay>;
  /** Open order counts keyed by stay id. */
  openOrderCountByStayId: Map<string, number>;
  /** The currently selected floor filter value: 'all' or the floor number as a string. */
  selectedFloorFilter: string;
  /** Distinct floor numbers extracted from allRooms, sorted ascending. */
  availableFloors: number[];
  /** Called when the user picks a different floor tab. */
  onFloorFilterChange: (floorValue: string) => void;
  /** Hotel time zone for checkout date comparisons. */
  hotelTimeZone?: string;
  /** Whether the signed-in user may check guests in and out. */
  canCheckGuestsInAndOut: boolean;
  /** Called when the user clicks "Check in" for a vacant room. */
  onCheckInRequest: (room: Room) => void;
  /** Called when the user clicks "Check out" for an occupied room. */
  onCheckOutRequest: (stay: Stay) => void;
  /** Called when the grid is empty and the user wants to add rooms. */
  onAddRoomsRequest?: () => void;
  /** Whether the signed-in user can add rooms (shows Add rooms button in empty state). */
  canManageRooms: boolean;
}

/**
 * Renders a floor-filter tab bar followed by a responsive grid of room cards.
 *
 * Each card shows the room number, occupancy badge, guest name (if occupied),
 * departure date, open order count, and an action button to check in or out.
 */
export function RoomCardGrid({
  allRooms,
  stayByRoomId,
  openOrderCountByStayId,
  selectedFloorFilter,
  availableFloors,
  onFloorFilterChange,
  hotelTimeZone,
  canCheckGuestsInAndOut,
  onCheckInRequest,
  onCheckOutRequest,
  onAddRoomsRequest,
  canManageRooms,
}: RoomCardGridProps) {
  const visibleRooms = useMemo(
    () =>
      allRooms.filter(
        (room) => selectedFloorFilter === 'all' || String(room.floor) === selectedFloorFilter,
      ),
    [allRooms, selectedFloorFilter],
  );

  const floorFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All floors' },
      ...availableFloors.map((floorNumber) => ({
        value: String(floorNumber),
        label: `Floor ${floorNumber}`,
      })),
    ],
    [availableFloors],
  );

  if (allRooms.length === 0) {
    return (
      <Panel>
        <EmptyState
          title="No rooms yet"
          action={
            canManageRooms && onAddRoomsRequest ? (
              <Button variant="primary" onClick={onAddRoomsRequest}>
                Add rooms
              </Button>
            ) : undefined
          }
        >
          {canManageRooms
            ? "Add the hotel's rooms to print their QR codes."
            : "An admin needs to add the hotel's rooms."}
        </EmptyState>
      </Panel>
    );
  }

  return (
    <>
      {availableFloors.length > 1 && (
        <div className="mb-4">
          <Segmented
            label="Floor"
            value={selectedFloorFilter}
            onChange={onFloorFilterChange}
            options={floorFilterOptions}
          />
        </div>
      )}

      <ul
        aria-label="Room inventory"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
      >
        {visibleRooms.map((room) => {
          const activeStay = stayByRoomId.get(room.id);
          const occupancyStatus = deriveRoomOccupancyStatus(room, activeStay, hotelTimeZone);
          const openOrderCount = activeStay
            ? (openOrderCountByStayId.get(activeStay.id) ?? 0)
            : 0;

          return (
            <RoomCard
              key={room.id}
              room={room}
              activeStay={activeStay}
              occupancyStatus={occupancyStatus}
              openOrderCount={openOrderCount}
              hotelTimeZone={hotelTimeZone}
              canCheckGuestsInAndOut={canCheckGuestsInAndOut}
              onCheckInRequest={onCheckInRequest}
              onCheckOutRequest={onCheckOutRequest}
            />
          );
        })}
      </ul>
    </>
  );
}

interface RoomCardProps {
  room: Room;
  activeStay: Stay | undefined;
  occupancyStatus: RoomOccupancyStatus;
  openOrderCount: number;
  hotelTimeZone?: string;
  canCheckGuestsInAndOut: boolean;
  onCheckInRequest: (room: Room) => void;
  onCheckOutRequest: (stay: Stay) => void;
}

/**
 * A single room card showing number, floor label, occupancy badge, guest
 * details when occupied, and a contextual action button.
 */
function RoomCard({
  room,
  activeStay,
  occupancyStatus,
  openOrderCount,
  hotelTimeZone,
  canCheckGuestsInAndOut,
  onCheckInRequest,
  onCheckOutRequest,
}: RoomCardProps) {
  const { label: occupancyLabel, tone: occupancyTone } = OCCUPANCY_DISPLAY[occupancyStatus];

  return (
    <li
      className="flex flex-col rounded-md border border-line bg-surface px-4 py-3.5"
      aria-label={`Room ${room.number}`}
    >
      {/* Header row: room number + occupancy badge */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h2 className="tabular text-base font-semibold text-ink">{room.number}</h2>
          <p className="mt-0.5 text-xs text-ink-3">Floor {room.floor}</p>
        </div>
        <StatusLabel tone={occupancyTone}>{occupancyLabel}</StatusLabel>
      </div>

      {/* Guest detail or vacancy message */}
      <div className="mt-2 min-h-[2.75rem] text-[13px]">
        {activeStay ? (
          <>
            <p className="truncate font-medium text-ink">{activeStay.guestName}</p>
            <p className="text-ink-3">
              Departs{' '}
              {isSameDay(activeStay.expectedCheckOutAt, hotelTimeZone)
                ? 'today'
                : formatDay(activeStay.expectedCheckOutAt, hotelTimeZone)}
              {openOrderCount > 0 && (
                <span className="text-ink-2">
                  {' · '}
                  {openOrderCount} open {openOrderCount === 1 ? 'order' : 'orders'}
                </span>
              )}
            </p>
          </>
        ) : room.isOutOfOrder ? (
          <p className="text-ink-3">{room.outOfOrderReason || 'Not available to guests'}</p>
        ) : (
          <p className="text-ink-3">Ready for a guest</p>
        )}
      </div>

      {/* Action button */}
      {canCheckGuestsInAndOut && (
        <div className="mt-3">
          {activeStay ? (
            <Button size="sm" className="w-full" onClick={() => onCheckOutRequest(activeStay)}>
              Check out
            </Button>
          ) : !room.isOutOfOrder ? (
            <Button size="sm" className="w-full" onClick={() => onCheckInRequest(room)}>
              Check in
            </Button>
          ) : null}
        </div>
      )}
    </li>
  );
}
