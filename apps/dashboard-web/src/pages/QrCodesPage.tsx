/**
 * QrCodesPage — Screen UI-09: Room and QR code management for hotel admins.
 *
 * Displays all rooms in a sortable table with their QR code status. Admins
 * can:
 *   - Add rooms (single or range) via CreateRoomModal
 *   - Edit room details via EditRoomDialog
 *   - Regenerate QR codes for one or more rooms
 *   - Download a printable PDF tent-card sheet via QrPdfModal
 *   - Copy the guest-facing room link to the clipboard
 *
 * Guards:
 *   - PAGE requires Permission.MANAGE_ROOMS_AND_QR_CODES (enforced by router)
 */

import { Copy, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { Field, FormError, Input } from '../components/ui/Field';
import { Overlay } from '../components/ui/Overlay';
import { EmptyState, ErrorState, LoadingRows, PageHeader, Panel, table } from '../components/ui/Page';
import { Segmented } from '../components/ui/Segmented';
import { StatusLabel } from '../components/ui/Status';
import { Switch } from '../components/ui/Switch';
import { useToast } from '../components/ui/Toast';
import { cx } from '../components/ui/cx';
import { useHotelLocale } from '../features/hotel/useHotel';
import { useCreateRooms, useRegenerateQrCodes, useRooms, useUpdateRoom } from '../features/rooms/api';
import { CreateRoomModal, expandRoomNumberRange } from '../features/rooms/components/CreateRoomModal';
import { QrPdfModal } from '../features/rooms/components/QrPdfModal';
import type { Room } from '../lib/api-types';
import { describeError } from '../lib/error-handler';
import { formatDay } from '../lib/format';
import { useMemo } from 'react';

/**
 * Backward-compatible alias for expandRoomNumberRange, preserved so
 * existing test files continue to work without modification.
 *
 * @deprecated Use expandRoomNumberRange from features/rooms/components/CreateRoomModal instead.
 */
export function expandRoomNumbers(firstRoomNumber: string, lastRoomNumber: string): string[] | null {
  return expandRoomNumberRange(firstRoomNumber, lastRoomNumber);
}

export function QrCodesPage() {
  const { timeZone } = useHotelLocale();
  const rooms = useRooms();
  const regenerate = useRegenerateQrCodes();
  const toast = useToast();

  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [roomBeingEdited, setRoomBeingEdited] = useState<Room | null>(null);
  const [roomsPendingRegeneration, setRoomsPendingRegeneration] = useState<Room[] | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const allRooms = rooms.data ?? [];
  const allRoomsSelected = allRooms.length > 0 && selectedRoomIds.size === allRooms.length;

  const distinctFloors = useMemo(
    () => [...new Set(allRooms.map((room) => room.floor))].sort((floorA, floorB) => floorA - floorB),
    [allRooms],
  );

  function toggleRoomSelection(roomId: string) {
    setSelectedRoomIds((currentSelected) => {
      const nextSelected = new Set(currentSelected);
      if (nextSelected.has(roomId)) nextSelected.delete(roomId);
      else nextSelected.add(roomId);
      return nextSelected;
    });
  }

  async function copyRoomLink(room: Room) {
    try {
      await navigator.clipboard.writeText(room.qrUrl);
      toast.show(`Link for Room ${room.number} copied`);
    } catch {
      toast.error('Could not copy. Select the link and copy it manually.');
    }
  }

  function initiateQrRegeneration(targetRooms: Room[]) {
    regenerate.mutate(
      targetRooms.map((room) => room.id),
      {
        onSuccess: () => {
          const successMessage =
            targetRooms.length === 1
              ? `New QR code issued for Room ${targetRooms[0].number}`
              : `New QR codes issued for ${targetRooms.length} rooms`;
          toast.show(successMessage);
          setSelectedRoomIds(new Set());
          setRoomsPendingRegeneration(null);
        },
        onError: (error) => toast.error(describeError(error)),
      },
    );
  }

  return (
    <>
      <PageHeader
        title="Rooms & QR codes"
        description="Each room has its own QR code. Guests scan it to order; it only works while someone is checked in."
        actions={
          <>
            <Button onClick={() => setIsPdfModalOpen(true)} disabled={allRooms.length === 0}>
              Download cards (PDF)
            </Button>
            <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Add rooms
            </Button>
          </>
        }
      />

      {/* Bulk action toolbar — appears when rooms are selected */}
      {selectedRoomIds.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-2 text-[13px]">
          <span className="text-ink-2">{selectedRoomIds.size} selected</span>
          <Button
            size="sm"
            onClick={() =>
              setRoomsPendingRegeneration(
                allRooms.filter((room) => selectedRoomIds.has(room.id)),
              )
            }
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
            Issue new QR codes
          </Button>
          <button
            type="button"
            className="ml-auto text-ink-3 hover:text-ink"
            onClick={() => setSelectedRoomIds(new Set())}
          >
            Clear
          </button>
        </div>
      )}

      {/* Room table */}
      <Panel>
        {rooms.isPending && <LoadingRows rows={6} label="Loading rooms" />}
        {rooms.error && (
          <ErrorState
            message={describeError(rooms.error)}
            onRetry={() => void rooms.refetch()}
          />
        )}
        {rooms.data?.length === 0 && (
          <EmptyState
            title="No rooms yet"
            action={
              <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                Add rooms
              </Button>
            }
          >
            Add rooms one at a time or a whole floor at once.
          </EmptyState>
        )}

        {allRooms.length > 0 && (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={cx(table.th, 'w-10')}>
                    <input
                      type="checkbox"
                      aria-label="Select all rooms"
                      checked={allRoomsSelected}
                      onChange={() =>
                        setSelectedRoomIds(
                          allRoomsSelected ? new Set() : new Set(allRooms.map((room) => room.id)),
                        )
                      }
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                  </th>
                  <th className={table.th}>Room</th>
                  <th className={table.th}>Floor</th>
                  <th className={table.th}>Status</th>
                  <th className={table.th}>Guest link</th>
                  <th className={table.th}>Code issued</th>
                  <th className={cx(table.th, 'text-right')}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className={table.body}>
                {allRooms.map((room) => (
                  <tr key={room.id} className={table.row}>
                    <td className={table.td}>
                      <input
                        type="checkbox"
                        aria-label={`Select Room ${room.number}`}
                        checked={selectedRoomIds.has(room.id)}
                        onChange={() => toggleRoomSelection(room.id)}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                    </td>
                    <td className={cx(table.td, 'tabular font-medium text-ink')}>{room.number}</td>
                    <td className={cx(table.td, 'tabular')}>{room.floor}</td>
                    <td className={table.td}>
                      {room.isOutOfOrder ? (
                        <StatusLabel tone="void">Out of order</StatusLabel>
                      ) : (
                        <StatusLabel tone="neutral">In service</StatusLabel>
                      )}
                    </td>
                    <td className={table.td}>
                      <button
                        type="button"
                        onClick={() => void copyRoomLink(room)}
                        className="inline-flex max-w-[16rem] items-center gap-1.5 text-xs text-ink-3 hover:text-ink"
                        title="Copy link"
                      >
                        <span className="truncate font-mono">
                          {room.qrUrl.replace(/^https?:\/\//, '')}
                        </span>
                        <Copy className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                        <span className="sr-only">Copy link for Room {room.number}</span>
                      </button>
                    </td>
                    <td className={cx(table.td, 'whitespace-nowrap text-xs')}>
                      {room.qrRegeneratedAt ? formatDay(room.qrRegeneratedAt, timeZone) : 'Original'}
                    </td>
                    <td className={cx(table.td, 'whitespace-nowrap text-right')}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRoomsPendingRegeneration([room])}
                      >
                        New code
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRoomBeingEdited(room)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Create room modal — extracted into reusable component */}
      <CreateRoomModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

      {/* Edit room dialog */}
      <EditRoomDialog room={roomBeingEdited} onClose={() => setRoomBeingEdited(null)} />

      {/* Confirm QR regeneration dialog */}
      {roomsPendingRegeneration && (
        <Overlay
          open
          width="sm"
          onClose={() => setRoomsPendingRegeneration(null)}
          title={
            roomsPendingRegeneration.length === 1
              ? `New QR code for Room ${roomsPendingRegeneration[0].number}`
              : `New QR codes for ${roomsPendingRegeneration.length} rooms`
          }
          footer={
            <>
              <Button onClick={() => setRoomsPendingRegeneration(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => initiateQrRegeneration(roomsPendingRegeneration)}
                pending={regenerate.isPending}
              >
                Issue new {roomsPendingRegeneration.length === 1 ? 'code' : 'codes'}
              </Button>
            </>
          }
        >
          <p className="text-[13px] text-ink-2">
            The printed {roomsPendingRegeneration.length === 1 ? 'card stops' : 'cards stop'}{' '}
            working immediately. Print and place the new{' '}
            {roomsPendingRegeneration.length === 1 ? 'card' : 'cards'} from the PDF before guests
            need them.
          </p>
        </Overlay>
      )}

      {/* QR PDF download modal — extracted into reusable component */}
      <QrPdfModal
        isOpen={isPdfModalOpen}
        availableFloors={distinctFloors}
        onClose={() => setIsPdfModalOpen(false)}
      />
    </>
  );
}

// ─── EditRoomDialog ───────────────────────────────────────────────────────────

function EditRoomDialog({ room, onClose }: { room: Room | null; onClose: () => void }) {
  const updateRoom = useUpdateRoom();
  const toast = useToast();
  const [roomNumber, setRoomNumber] = useState('');
  const [rawFloorInput, setRawFloorInput] = useState('');
  const [isOutOfOrder, setIsOutOfOrder] = useState(false);
  const [outOfOrderReason, setOutOfOrderReason] = useState('');

  useEffect(() => {
    if (!room) return;
    setRoomNumber(room.number);
    setRawFloorInput(String(room.floor));
    setIsOutOfOrder(room.isOutOfOrder);
    setOutOfOrderReason(room.outOfOrderReason ?? '');
    updateRoom.reset();
  }, [room?.id]);

  if (!room) return null;

  const formIsValid = roomNumber.trim() && /^\d{1,3}$/.test(rawFloorInput);

  function handleFormSubmit(event: FormEvent) {
    event.preventDefault();
    if (!room || !formIsValid) return;
    updateRoom.mutate(
      {
        roomId: room.id,
        update: {
          number: roomNumber.trim(),
          floor: Number(rawFloorInput),
          isOutOfOrder,
          outOfOrderReason: isOutOfOrder ? outOfOrderReason.trim() || null : null,
        },
      },
      {
        onSuccess: () => {
          toast.show(`Room ${roomNumber.trim()} saved`);
          onClose();
        },
      },
    );
  }

  return (
    <Overlay
      open
      onClose={onClose}
      width="sm"
      title={`Edit Room ${room.number}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            form="edit-room-form"
            pending={updateRoom.isPending}
            disabled={!formIsValid}
          >
            Save
          </Button>
        </>
      }
    >
      <form id="edit-room-form" onSubmit={handleFormSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Room number">
            <Input
              value={roomNumber}
              maxLength={10}
              onChange={(event) => setRoomNumber(event.target.value)}
              data-autofocus
            />
          </Field>
          <Field label="Floor">
            <Input
              inputMode="numeric"
              value={rawFloorInput}
              onChange={(event) => setRawFloorInput(event.target.value.replace(/\D/g, ''))}
            />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-md border border-line px-3.5 py-3">
          <div>
            <p className="text-[13px] font-medium text-ink">Out of order</p>
            <p className="text-xs text-ink-3">
              The room cannot be checked into while out of order.
            </p>
          </div>
          <Switch checked={isOutOfOrder} onChange={setIsOutOfOrder} label="Out of order" />
        </div>

        {isOutOfOrder && (
          <Field label="Reason" optional hint='Shown to reception, e.g. "AC repair".'>
            <Input
              value={outOfOrderReason}
              maxLength={120}
              onChange={(event) => setOutOfOrderReason(event.target.value)}
            />
          </Field>
        )}

        <FormError>{updateRoom.error ? describeError(updateRoom.error) : null}</FormError>
      </form>
    </Overlay>
  );
}
