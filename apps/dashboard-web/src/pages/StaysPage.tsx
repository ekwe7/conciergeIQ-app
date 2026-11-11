/**
 * StaysPage — Screen UI-06: Reception Guest Check-In & Check-Out Lifecycle Management.
 *
 * Provides hotel receptionists and managers with:
 *   - Live room occupancy tracking and today's arrivals / departures KPIs
 *   - Floor-filtered grid and list views of rooms and active guest stays
 *   - Guest check-in modal with room picker (activating room QR codes)
 *   - Room folio bill modal with uncollected balance warning and checkout verification
 *
 * Data sources:
 *   GET /api/v1/rooms  — hotel room inventory
 *   GET /api/v1/stays  — active guest stays
 *   GET /api/v1/orders — open order counts per stay
 */

import { useMemo, useState } from 'react';
import { DoorOpen, Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ErrorState, LoadingRows, PageHeader, Panel, Stat } from '../components/ui/Page';
import { Segmented } from '../components/ui/Segmented';
import { useAuth } from '../features/auth/AuthProvider';
import { useHotelLocale } from '../features/hotel/useHotel';
import { useOrders } from '../features/orders/api';
import { useRooms } from '../features/rooms/api';
import { CreateRoomModal } from '../features/rooms/components/CreateRoomModal';
import { RoomCardGrid, deriveRoomOccupancyStatus } from '../features/rooms/components/RoomCardGrid';
import { useStays } from '../features/stays/api';
import { CheckInModal } from '../features/stays/components/CheckInModal';
import { CheckOutBillModal } from '../features/stays/components/CheckOutBillModal';
import { StaysTable } from '../features/stays/components/StaysTable';
import type { Room, Stay } from '../lib/api-types';
import { describeError } from '../lib/error-handler';
import { isSameDay } from '../lib/format';
import { Permission } from '../lib/permissions';

export type StaysViewDisplayMode = 'grid' | 'list';

export function StaysPage() {
  const { can: checkPermission } = useAuth();
  const { currency: hotelCurrency, timeZone: hotelTimeZone } = useHotelLocale();

  const roomsQuery = useRooms();
  const staysQuery = useStays();
  const ordersQuery = useOrders();

  const [selectedFloorFilter, setSelectedFloorFilter] = useState<string>('all');
  const [viewDisplayMode, setViewDisplayMode] = useState<StaysViewDisplayMode>('grid');

  // Modal open states
  const [roomBeingCheckedIn, setRoomBeingCheckedIn] = useState<Room | null>(null);
  const [isQuickCheckInModalOpen, setIsQuickCheckInModalOpen] = useState<boolean>(false);
  const [stayBeingCheckedOut, setStayBeingCheckedOut] = useState<Stay | null>(null);
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState<boolean>(false);

  const canCheckGuestsInAndOut = checkPermission(Permission.CHECK_GUESTS_IN_AND_OUT);
  const canManageRoomsAndQrCodes = checkPermission(Permission.MANAGE_ROOMS_AND_QR_CODES);

  /** Map active stays by roomId for fast lookup */
  const stayByRoomIdMap = useMemo(() => {
    const mapping = new Map<string, Stay>();
    for (const currentStay of staysQuery.data ?? []) {
      mapping.set(currentStay.roomId, currentStay);
    }
    return mapping;
  }, [staysQuery.data]);

  /** Count open orders per stay so room cards & table show "X open orders" */
  const openOrderCountByStayIdMap = useMemo(() => {
    const countsMapping = new Map<string, number>();
    for (const currentOrder of ordersQuery.data ?? []) {
      if (currentOrder.status === 'PENDING' || currentOrder.status === 'IN_PROGRESS') {
        const existingCount = countsMapping.get(currentOrder.stayId) ?? 0;
        countsMapping.set(currentOrder.stayId, existingCount + 1);
      }
    }
    return countsMapping;
  }, [ordersQuery.data]);

  const distinctFloorsList = useMemo(() => {
    const floorSet = new Set<number>();
    for (const currentRoom of roomsQuery.data ?? []) {
      floorSet.add(currentRoom.floor);
    }
    return [...floorSet].sort((firstFloor, secondFloor) => firstFloor - secondFloor);
  }, [roomsQuery.data]);

  // ─── KPI Calculations ─────────────────────────────────────────────────────

  const allHotelRooms = roomsQuery.data ?? [];
  const activeStaysList = staysQuery.data ?? [];

  const roomOccupancyStatusList = allHotelRooms.map((currentRoom) =>
    deriveRoomOccupancyStatus(
      currentRoom,
      stayByRoomIdMap.get(currentRoom.id),
      hotelTimeZone,
    ),
  );

  const occupiedRoomsCount = roomOccupancyStatusList.filter(
    (statusValue) => statusValue === 'occupied' || statusValue === 'due-out',
  ).length;

  const dueOutRoomsCount = roomOccupancyStatusList.filter(
    (statusValue) => statusValue === 'due-out',
  ).length;

  const outOfOrderRoomsCount = roomOccupancyStatusList.filter(
    (statusValue) => statusValue === 'out-of-order',
  ).length;

  const sellableRoomsCount = allHotelRooms.length - outOfOrderRoomsCount;

  const arrivalsTodayCount = activeStaysList.filter((currentStay) =>
    isSameDay(currentStay.checkedInAt, hotelTimeZone),
  ).length;

  const occupancyPercentage = sellableRoomsCount > 0
    ? Math.round((occupiedRoomsCount / sellableRoomsCount) * 100)
    : null;

  // Filter vacant rooms available for the room picker
  const vacantAvailableRooms = useMemo(() => {
    return allHotelRooms.filter((candidateRoom) => {
      const hasActiveStay = stayByRoomIdMap.has(candidateRoom.id);
      return !hasActiveStay && !candidateRoom.isOutOfOrder;
    });
  }, [allHotelRooms, stayByRoomIdMap]);

  // Filter stays by floor for the list/table view
  const filteredStaysList = useMemo(() => {
    if (selectedFloorFilter === 'all') {
      return activeStaysList;
    }
    const targetFloorNumber = parseInt(selectedFloorFilter, 10);
    return activeStaysList.filter((currentStay) => {
      const associatedRoom = allHotelRooms.find(
        (roomItem) => roomItem.id === currentStay.roomId,
      );
      return associatedRoom ? associatedRoom.floor === targetFloorNumber : true;
    });
  }, [activeStaysList, allHotelRooms, selectedFloorFilter]);

  const isDataLoading = roomsQuery.isPending || staysQuery.isPending;
  const loadingError = roomsQuery.error ?? staysQuery.error;

  return (
    <>
      <PageHeader
        title="Rooms & stays"
        description={
          roomsQuery.data
            ? `${allHotelRooms.length} rooms · ${occupiedRoomsCount} occupied · ${dueOutRoomsCount} checking out today`
            : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            {canManageRoomsAndQrCodes && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsCreateRoomModalOpen(true)}
                className="inline-flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Add rooms</span>
              </Button>
            )}

            {canCheckGuestsInAndOut && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsQuickCheckInModalOpen(true)}
                className="inline-flex items-center gap-1.5"
              >
                <DoorOpen className="h-4 w-4" />
                <span>Quick check-in</span>
              </Button>
            )}
          </div>
        }
      />

      {isDataLoading && <LoadingRows rows={6} label="Loading rooms & stays" />}

      {loadingError && !isDataLoading && (
        <Panel>
          <ErrorState
            message={describeError(loadingError)}
            onRetry={() => {
              void roomsQuery.refetch();
              void staysQuery.refetch();
            }}
          />
        </Panel>
      )}

      {roomsQuery.data && staysQuery.data && (
        <>
          {/* KPI Headline Summary Cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Occupancy"
              value={occupancyPercentage !== null ? `${occupancyPercentage}%` : '–'}
              detail={`${occupiedRoomsCount} of ${sellableRoomsCount} sellable rooms`}
            />
            <Stat label="Arrivals today" value={arrivalsTodayCount} />
            <Stat label="Departures today" value={dueOutRoomsCount} />
            <Stat label="Out of order" value={outOfOrderRoomsCount} />
          </div>

          {/* View Mode & Floor Filtering Controls */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Floor filter segmented tab bar */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedFloorFilter('all')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedFloorFilter === 'all'
                    ? 'bg-ink text-canvas'
                    : 'bg-surface text-ink-2 hover:bg-canvas hover:text-ink border border-line'
                }`}
              >
                All floors
              </button>
              {distinctFloorsList.map((floorNumber) => {
                const floorStringValue = String(floorNumber);
                const isSelected = selectedFloorFilter === floorStringValue;
                return (
                  <button
                    key={floorNumber}
                    type="button"
                    onClick={() => setSelectedFloorFilter(floorStringValue)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-ink text-canvas'
                        : 'bg-surface text-ink-2 hover:bg-canvas hover:text-ink border border-line'
                    }`}
                  >
                    Floor {floorNumber}
                  </button>
                );
              })}
            </div>

            {/* View Mode switcher: Grid vs List */}
            <div className="flex items-center self-end sm:self-auto">
              <Segmented<StaysViewDisplayMode>
                label="Rooms and stays view mode"
                value={viewDisplayMode}
                onChange={setViewDisplayMode}
                options={[
                  { value: 'grid', label: 'Grid' },
                  { value: 'list', label: 'List' },
                ]}
              />
            </div>
          </div>

          {/* Grid View */}
          {viewDisplayMode === 'grid' && (
            <RoomCardGrid
              allRooms={allHotelRooms}
              stayByRoomId={stayByRoomIdMap}
              openOrderCountByStayId={openOrderCountByStayIdMap}
              selectedFloorFilter={selectedFloorFilter}
              availableFloors={distinctFloorsList}
              onFloorFilterChange={setSelectedFloorFilter}
              hotelTimeZone={hotelTimeZone}
              canCheckGuestsInAndOut={canCheckGuestsInAndOut}
              canManageRooms={canManageRoomsAndQrCodes}
              onCheckInRequest={setRoomBeingCheckedIn}
              onCheckOutRequest={setStayBeingCheckedOut}
            />
          )}

          {/* List / Table View */}
          {viewDisplayMode === 'list' && (
            <StaysTable
              staysList={filteredStaysList}
              openOrderCountByStayId={openOrderCountByStayIdMap}
              hotelTimeZone={hotelTimeZone}
              canCheckGuestsInAndOut={canCheckGuestsInAndOut}
              onCheckOutRequest={setStayBeingCheckedOut}
            />
          )}
        </>
      )}

      {/* Check In Modal (when opened from specific room card) */}
      <CheckInModal
        isOpen={Boolean(roomBeingCheckedIn)}
        onClose={() => setRoomBeingCheckedIn(null)}
        preselectedRoom={roomBeingCheckedIn}
      />

      {/* Quick Check In Modal (when opened with room picker dropdown) */}
      <CheckInModal
        isOpen={isQuickCheckInModalOpen}
        onClose={() => setIsQuickCheckInModalOpen(false)}
        availableRooms={vacantAvailableRooms}
      />

      {/* Consolidated Folio Bill Check Out Modal */}
      <CheckOutBillModal
        isOpen={Boolean(stayBeingCheckedOut)}
        onClose={() => setStayBeingCheckedOut(null)}
        stay={stayBeingCheckedOut}
        currency={hotelCurrency}
        timeZone={hotelTimeZone}
      />

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isCreateRoomModalOpen}
        onClose={() => setIsCreateRoomModalOpen(false)}
      />
    </>
  );
}
