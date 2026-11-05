import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, LoadingRows, PageHeader, Panel, Stat } from '../components/ui/Page';
import { Segmented } from '../components/ui/Segmented';
import { StatusLabel } from '../components/ui/Status';
import { useAuth } from '../features/auth/AuthProvider';
import { useHotelLocale } from '../features/hotel/useHotel';
import { useOrders } from '../features/orders/api';
import { useRooms, useStays } from '../features/rooms/api';
import { CheckInDialog, CheckOutDialog } from '../features/rooms/StayDialogs';
import type { Room, Stay } from '../lib/api-types';
import { describeError } from '../lib/error-handler';
import { formatDay, isSameDay } from '../lib/format';
import { Permission } from '../lib/permissions';

type Occupancy = 'occupied' | 'due-out' | 'vacant' | 'out-of-order';

const OCCUPANCY: Record<Occupancy, { label: string; tone: 'done' | 'pending' | 'neutral' | 'void' }> = {
  occupied: { label: 'Occupied', tone: 'done' },
  'due-out': { label: 'Due out', tone: 'pending' },
  vacant: { label: 'Vacant', tone: 'neutral' },
  'out-of-order': { label: 'Out of order', tone: 'void' },
};

export function occupancyOf(room: Room, stay: Stay | undefined, timeZone?: string, now = new Date()): Occupancy {
  if (stay) {
    const due = new Date(stay.expectedCheckOutAt) <= now || isSameDay(stay.expectedCheckOutAt, timeZone, now);
    return due ? 'due-out' : 'occupied';
  }
  return room.isOutOfOrder ? 'out-of-order' : 'vacant';
}

export function RoomsPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const { currency, timeZone } = useHotelLocale();
  const rooms = useRooms();
  const stays = useStays();
  const orders = useOrders();
  const [floor, setFloor] = useState('all');
  const [checkingIn, setCheckingIn] = useState<Room | null>(null);
  const [checkingOut, setCheckingOut] = useState<Stay | null>(null);

  const canCheckGuests = can(Permission.CHECK_GUESTS_IN_AND_OUT);
  const canManageRooms = can(Permission.MANAGE_ROOMS_AND_QR_CODES);

  const stayByRoom = useMemo(() => new Map((stays.data ?? []).map((stay) => [stay.roomId, stay])), [stays.data]);
  const openOrdersByStay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of orders.data ?? []) {
      if (order.status === 'PENDING' || order.status === 'IN_PROGRESS') counts.set(order.stayId, (counts.get(order.stayId) ?? 0) + 1);
    }
    return counts;
  }, [orders.data]);

  const floors = useMemo(() => [...new Set((rooms.data ?? []).map((room) => room.floor))].sort((a, b) => a - b), [rooms.data]);
  const visible = (rooms.data ?? []).filter((room) => floor === 'all' || String(room.floor) === floor);

  const all = rooms.data ?? [];
  const states = all.map((room) => occupancyOf(room, stayByRoom.get(room.id), timeZone));
  const occupied = states.filter((state) => state === 'occupied' || state === 'due-out').length;
  const dueOut = states.filter((state) => state === 'due-out').length;
  const outOfOrder = states.filter((state) => state === 'out-of-order').length;
  const sellable = all.length - outOfOrder;
  const arrivalsToday = (stays.data ?? []).filter((stay) => isSameDay(stay.checkedInAt, timeZone)).length;

  const loading = rooms.isPending || stays.isPending;
  const error = rooms.error ?? stays.error;

  return (
    <>
      <PageHeader
        title="Rooms & stays"
        description={rooms.data ? `${all.length} rooms · ${occupied} occupied · ${dueOut} due out today` : undefined}
        actions={
          canManageRooms && (
            <Link to="/qr-codes" className="text-[13px] font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline">
              Manage rooms and QR codes
            </Link>
          )
        }
      />

      {loading && <LoadingRows rows={6} label="Loading rooms" />}
      {error && !loading && (
        <Panel>
          <ErrorState
            message={describeError(error)}
            onRetry={() => {
              void rooms.refetch();
              void stays.refetch();
            }}
          />
        </Panel>
      )}

      {rooms.data && stays.data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Occupancy" value={sellable ? `${Math.round((occupied / sellable) * 100)}%` : '–'} detail={`${occupied} of ${sellable} available rooms`} />
            <Stat label="Arrivals today" value={arrivalsToday} />
            <Stat label="Departures today" value={dueOut} />
            <Stat label="Out of order" value={outOfOrder} />
          </div>

          {floors.length > 1 && (
            <div className="mb-4">
              <Segmented
                label="Floor"
                value={floor}
                onChange={setFloor}
                options={[{ value: 'all', label: 'All floors' }, ...floors.map((value) => ({ value: String(value), label: `Floor ${value}` }))]}
              />
            </div>
          )}

          {all.length === 0 ? (
            <Panel>
              <EmptyState
                title="No rooms yet"
                action={
                  canManageRooms && (
                    <Button variant="primary" onClick={() => navigate('/qr-codes')}>
                      Add rooms
                    </Button>
                  )
                }
              >
                {canManageRooms ? 'Add the hotel’s rooms to print their QR codes.' : 'An admin needs to add the hotel’s rooms.'}
              </EmptyState>
            </Panel>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {visible.map((room) => {
                const stay = stayByRoom.get(room.id);
                const state = occupancyOf(room, stay, timeZone);
                const openOrders = stay ? openOrdersByStay.get(stay.id) ?? 0 : 0;
                return (
                  <li key={room.id} className="flex flex-col rounded-md border border-line bg-surface px-4 py-3.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="tabular text-base font-semibold text-ink">{room.number}</h2>
                      <StatusLabel tone={OCCUPANCY[state].tone}>{OCCUPANCY[state].label}</StatusLabel>
                    </div>
                    <div className="mt-2 min-h-[2.75rem] text-[13px]">
                      {stay ? (
                        <>
                          <p className="truncate font-medium text-ink">{stay.guestName}</p>
                          <p className="text-ink-3">
                            Departs {isSameDay(stay.expectedCheckOutAt, timeZone) ? 'today' : formatDay(stay.expectedCheckOutAt, timeZone)}
                            {openOrders > 0 && (
                              <span className="text-ink-2">
                                {' · '}
                                {openOrders} open {openOrders === 1 ? 'order' : 'orders'}
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
                    {canCheckGuests && (
                      <div className="mt-3">
                        {stay ? (
                          <Button size="sm" className="w-full" onClick={() => setCheckingOut(stay)}>
                            Check out
                          </Button>
                        ) : !room.isOutOfOrder ? (
                          <Button size="sm" className="w-full" onClick={() => setCheckingIn(room)}>
                            Check in
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <CheckInDialog room={checkingIn} onClose={() => setCheckingIn(null)} />
      <CheckOutDialog stay={checkingOut} currency={currency} timeZone={timeZone} onClose={() => setCheckingOut(null)} />
    </>
  );
}
