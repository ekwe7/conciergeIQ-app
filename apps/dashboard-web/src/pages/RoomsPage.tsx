/**
 * RoomsPage — Screen UI-05 / UI-06 alias.
 * Renders StaysPage with live room inventory, occupancy stats, and guest check-in/out.
 */

import { deriveRoomOccupancyStatus } from '../features/rooms/components/RoomCardGrid';
import type { Room, Stay } from '../lib/api-types';
import { StaysPage } from './StaysPage';
 * RoomsPage — Screen UI-05: Hotel room inventory with live occupancy tracking.
 *
 * Shows headline KPIs (occupancy %, arrivals today, departures, out of order),
 * a floor filter tab bar, and a responsive card grid of all rooms.
 *
 * Data sources:
 *   GET /api/v1/rooms  — room list (via useRooms)
 *   GET /api/v1/stays  — active stays (via useStays)
 *   GET /api/v1/orders — open order counts per stay (via useOrders)
 *
 * Guards:
 *   - PAGE requires Permission.VIEW_ROOMS (enforced by router)
 *   - Check in/out buttons require Permission.CHECK_GUESTS_IN_AND_OUT
 *   - "Manage rooms and QR codes" link requires Permission.MANAGE_ROOMS_AND_QR_CODES
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingRows, PageHeader, Panel, Stat } from '../components/ui/Page';
import { useAuth } from '../features/auth/AuthProvider';
import { useHotelLocale } from '../features/hotel/useHotel';
import { useOrders } from '../features/orders/api';
import { useRooms, useStays } from '../features/rooms/api';
import { RoomCardGrid, deriveRoomOccupancyStatus } from '../features/rooms/components/RoomCardGrid';
import { CheckInDialog, CheckOutDialog } from '../features/rooms/StayDialogs';
import type { Room, Stay } from '../lib/api-types';
import { describeError } from '../lib/error-handler';
import { isSameDay } from '../lib/format';
import { Permission } from '../lib/permissions';

/**
 * Backward-compatible alias for deriveRoomOccupancyStatus, preserved so
 * existing test files and imports continue to work without modification.
 *
 * @deprecated Use deriveRoomOccupancyStatus from features/rooms/components/RoomCardGrid instead.
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
  const { can } = useAuth();
  const { currency, timeZone } = useHotelLocale();
  const rooms = useRooms();
  const stays = useStays();
  const orders = useOrders();

  const [selectedFloorFilter, setSelectedFloorFilter] = useState('all');
  const [roomBeingCheckedIn, setRoomBeingCheckedIn] = useState<Room | null>(null);
  const [stayBeingCheckedOut, setStayBeingCheckedOut] = useState<Stay | null>(null);

  const canCheckGuestsInAndOut = can(Permission.CHECK_GUESTS_IN_AND_OUT);
  const canManageRoomsAndQrCodes = can(Permission.MANAGE_ROOMS_AND_QR_CODES);

  /** Look up the active stay for a given room id in O(1). */
  const stayByRoomId = useMemo(
    () => new Map((stays.data ?? []).map((stay) => [stay.roomId, stay])),
    [stays.data],
  );

  /** Count open orders per stay so room cards can show "2 open orders". */
  const openOrderCountByStayId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const currentOrder of orders.data ?? []) {
      if (currentOrder.status === 'PENDING' || currentOrder.status === 'IN_PROGRESS') {
        counts.set(currentOrder.stayId, (counts.get(currentOrder.stayId) ?? 0) + 1);
      }
    }
    return counts;
  }, [orders.data]);

  const distinctFloors = useMemo(
    () => [...new Set((rooms.data ?? []).map((room) => room.floor))].sort((a, b) => a - b),
    [rooms.data],
  );

  // ─── KPI summary stats ───────────────────────────────────────────────────

  const allRooms = rooms.data ?? [];
  const occupancyStatuses = allRooms.map((room) =>
    deriveRoomOccupancyStatus(room, stayByRoomId.get(room.id), timeZone),
  );

  const occupiedRoomCount = occupancyStatuses.filter(
    (status) => status === 'occupied' || status === 'due-out',
  ).length;

  const dueOutRoomCount = occupancyStatuses.filter((status) => status === 'due-out').length;
  const outOfOrderRoomCount = occupancyStatuses.filter(
    (status) => status === 'out-of-order',
  ).length;

  const sellableRoomCount = allRooms.length - outOfOrderRoomCount;

  const arrivalsTodayCount = (stays.data ?? []).filter((stay) =>
    isSameDay(stay.checkedInAt, timeZone),
  ).length;

  const occupancyPercentage = sellableRoomCount
    ? Math.round((occupiedRoomCount / sellableRoomCount) * 100)
    : null;

  const isLoading = rooms.isPending || stays.isPending;
  const loadError = rooms.error ?? stays.error;

  return (
    <>
      <PageHeader
        title="Rooms & stays"
        description={
          rooms.data
            ? `${allRooms.length} rooms · ${occupiedRoomCount} occupied · ${dueOutRoomCount} due out today`
            : undefined
        }
        actions={
          canManageRoomsAndQrCodes && (
            <Link
              to="/qr-codes"
              className="text-[13px] font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline"
            >
              Manage rooms and QR codes
            </Link>
          )
        }
      />

      {isLoading && <LoadingRows rows={6} label="Loading rooms" />}

      {loadError && !isLoading && (
        <Panel>
          <ErrorState
            message={describeError(loadError)}
            onRetry={() => {
              void rooms.refetch();
              void stays.refetch();
            }}
          />
        </Panel>
      )}

      {rooms.data && stays.data && (
        <>
          {/* KPI summary stats row */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Occupancy"
              value={occupancyPercentage !== null ? `${occupancyPercentage}%` : '–'}
              detail={`${occupiedRoomCount} of ${sellableRoomCount} available rooms`}
            />
            <Stat label="Arrivals today" value={arrivalsTodayCount} />
            <Stat label="Departures today" value={dueOutRoomCount} />
            <Stat label="Out of order" value={outOfOrderRoomCount} />
          </div>

          {/* Room card grid with floor filter tabs */}
          <RoomCardGrid
            allRooms={allRooms}
            stayByRoomId={stayByRoomId}
            openOrderCountByStayId={openOrderCountByStayId}
            selectedFloorFilter={selectedFloorFilter}
            availableFloors={distinctFloors}
            onFloorFilterChange={setSelectedFloorFilter}
            hotelTimeZone={timeZone}
            canCheckGuestsInAndOut={canCheckGuestsInAndOut}
            canManageRooms={canManageRoomsAndQrCodes}
            onCheckInRequest={setRoomBeingCheckedIn}
            onCheckOutRequest={setStayBeingCheckedOut}
          />
        </>
      )}

      {/* Check-in / check-out dialogs (rendered outside the conditional so */}
      {/* they can animate out after data reloads) */}
      <CheckInDialog room={roomBeingCheckedIn} onClose={() => setRoomBeingCheckedIn(null)} />
      <CheckOutDialog
        stay={stayBeingCheckedOut}
        currency={currency}
        timeZone={timeZone}
        onClose={() => setStayBeingCheckedOut(null)}
      />
    </>
  );
}
