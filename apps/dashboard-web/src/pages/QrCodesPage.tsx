import { Copy, Download, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
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
import { useCreateRooms, useRegenerateQrCodes, useRooms, useUpdateRoom, type RoomInput } from '../features/rooms/api';
import { api, saveBlob } from '../lib/api-client';
import type { Room } from '../lib/api-types';
import { describeError } from '../lib/error-handler';
import { formatDay } from '../lib/format';

export function QrCodesPage() {
  const { timeZone } = useHotelLocale();
  const rooms = useRooms();
  const regenerate = useRegenerateQrCodes();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState<Room[] | null>(null);
  const [downloading, setDownloading] = useState(false);

  const all = rooms.data ?? [];
  const allSelected = all.length > 0 && selected.size === all.length;

  const toggle = (roomId: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });

  async function downloadPdf() {
    setDownloading(true);
    try {
      saveBlob(await api.getBlob('/rooms/qr.pdf'), 'room-qr-codes.pdf');
    } catch (error) {
      toast.error(describeError(error));
    } finally {
      setDownloading(false);
    }
  }

  async function copyLink(room: Room) {
    try {
      await navigator.clipboard.writeText(room.qrUrl);
      toast.show(`Link for Room ${room.number} copied`);
    } catch {
      toast.error('Could not copy. Select the link and copy it manually.');
    }
  }

  const runRegenerate = (targets: Room[]) =>
    regenerate.mutate(
      targets.map((room) => room.id),
      {
        onSuccess: () => {
          toast.show(targets.length === 1 ? `New QR code issued for Room ${targets[0].number}` : `New QR codes issued for ${targets.length} rooms`);
          setSelected(new Set());
          setConfirmRegenerate(null);
        },
        onError: (error) => toast.error(describeError(error)),
      },
    );

  return (
    <>
      <PageHeader
        title="Rooms & QR codes"
        description="Each room has its own QR code. Guests scan it to order; it only works while someone is checked in."
        actions={
          <>
            <Button onClick={downloadPdf} pending={downloading} disabled={all.length === 0}>
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Download cards (PDF)
            </Button>
            <Button variant="primary" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Add rooms
            </Button>
          </>
        }
      />

      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-2 text-[13px]">
          <span className="text-ink-2">{selected.size} selected</span>
          <Button size="sm" onClick={() => setConfirmRegenerate(all.filter((room) => selected.has(room.id)))}>
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
            Issue new QR codes
          </Button>
          <button type="button" className="ml-auto text-ink-3 hover:text-ink" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      <Panel>
        {rooms.isPending && <LoadingRows rows={6} label="Loading rooms" />}
        {rooms.error && <ErrorState message={describeError(rooms.error)} onRetry={() => void rooms.refetch()} />}
        {rooms.data?.length === 0 && (
          <EmptyState title="No rooms yet" action={<Button variant="primary" onClick={() => setAdding(true)}>Add rooms</Button>}>
            Add rooms one at a time or a whole floor at once.
          </EmptyState>
        )}
        {all.length > 0 && (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={cx(table.th, 'w-10')}>
                    <input
                      type="checkbox"
                      aria-label="Select all rooms"
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(all.map((room) => room.id)))}
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
                {all.map((room) => (
                  <tr key={room.id} className={table.row}>
                    <td className={table.td}>
                      <input
                        type="checkbox"
                        aria-label={`Select Room ${room.number}`}
                        checked={selected.has(room.id)}
                        onChange={() => toggle(room.id)}
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
                        onClick={() => void copyLink(room)}
                        className="inline-flex max-w-[16rem] items-center gap-1.5 text-xs text-ink-3 hover:text-ink"
                        title="Copy link"
                      >
                        <span className="truncate font-mono">{room.qrUrl.replace(/^https?:\/\//, '')}</span>
                        <Copy className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                        <span className="sr-only">Copy link for Room {room.number}</span>
                      </button>
                    </td>
                    <td className={cx(table.td, 'whitespace-nowrap text-xs')}>
                      {room.qrRegeneratedAt ? formatDay(room.qrRegeneratedAt, timeZone) : 'Original'}
                    </td>
                    <td className={cx(table.td, 'whitespace-nowrap text-right')}>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmRegenerate([room])}>
                        New code
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(room)}>
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

      <AddRoomsDialog open={adding} onClose={() => setAdding(false)} />
      <EditRoomDialog room={editing} onClose={() => setEditing(null)} />
      {confirmRegenerate && (
        <Overlay
          open
          width="sm"
          onClose={() => setConfirmRegenerate(null)}
          title={confirmRegenerate.length === 1 ? `New QR code for Room ${confirmRegenerate[0].number}` : `New QR codes for ${confirmRegenerate.length} rooms`}
          footer={
            <>
              <Button onClick={() => setConfirmRegenerate(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => runRegenerate(confirmRegenerate)} pending={regenerate.isPending}>
                Issue new {confirmRegenerate.length === 1 ? 'code' : 'codes'}
              </Button>
            </>
          }
        >
          <p className="text-[13px] text-ink-2">
            The printed {confirmRegenerate.length === 1 ? 'card stops' : 'cards stop'} working immediately. Print and place the new{' '}
            {confirmRegenerate.length === 1 ? 'card' : 'cards'} from the PDF before guests need them.
          </p>
        </Overlay>
      )}
    </>
  );
}

/** Expands "101-120" into 101, 102 … 120; anything else is a single room. */
export function expandRoomNumbers(from: string, to: string): string[] | null {
  const start = from.trim();
  const end = to.trim();
  if (!start) return null;
  if (!end || end === start) return [start];
  if (!/^\d+$/.test(start) || !/^\d+$/.test(end)) return null;
  const first = Number(start);
  const last = Number(end);
  if (last < first || last - first >= 500) return null;
  return Array.from({ length: last - first + 1 }, (_, index) => String(first + index).padStart(start.length, '0'));
}

function AddRoomsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateRooms();
  const toast = useToast();
  const [mode, setMode] = useState<'one' | 'range'>('range');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [floor, setFloor] = useState('1');

  useEffect(() => {
    if (!open) return;
    setFrom('');
    setTo('');
    setFloor('1');
    create.reset();
  }, [open]);

  const numbers = useMemo(() => expandRoomNumbers(from, mode === 'range' ? to : ''), [from, to, mode]);
  const floorNumber = Number(floor);
  const floorValid = /^\d{1,3}$/.test(floor) && floorNumber <= 200;
  const rangeError = mode === 'range' && from && to && !numbers ? 'Use numbers only, with the last at or above the first (up to 500 rooms).' : null;

  if (!open) return null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!numbers || !floorValid) return;
    const rooms: RoomInput[] = numbers.map((number) => ({ number, floor: floorNumber }));
    create.mutate(rooms, {
      onSuccess: (created) => {
        toast.show(created.length === 1 ? `Room ${created[0].number} added` : `${created.length} rooms added`);
        onClose();
      },
    });
  }

  return (
    <Overlay
      open
      onClose={onClose}
      width="sm"
      title="Add rooms"
      description="Each new room gets its own QR code."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="add-rooms" pending={create.isPending} disabled={!numbers || !floorValid}>
            {numbers && numbers.length > 1 ? `Add ${numbers.length} rooms` : 'Add room'}
          </Button>
        </>
      }
    >
      <form id="add-rooms" onSubmit={submit} className="space-y-4">
        <Segmented
          label="How many"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'range', label: 'A range' },
            { value: 'one', label: 'One room' },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label={mode === 'range' ? 'First room' : 'Room number'}>
            <Input value={from} maxLength={10} onChange={(event) => setFrom(event.target.value)} placeholder="101" data-autofocus />
          </Field>
          {mode === 'range' && (
            <Field label="Last room">
              <Input value={to} maxLength={10} onChange={(event) => setTo(event.target.value)} placeholder="120" />
            </Field>
          )}
        </div>
        <Field label="Floor" error={floor && !floorValid ? 'Enter a floor between 0 and 200.' : null}>
          <Input inputMode="numeric" value={floor} onChange={(event) => setFloor(event.target.value.replace(/\D/g, ''))} className="max-w-[8rem]" />
        </Field>
        {rangeError && <p className="text-xs text-danger">{rangeError}</p>}
        {numbers && numbers.length > 1 && (
          <p className="text-xs text-ink-3">
            Rooms {numbers[0]} to {numbers[numbers.length - 1]} on floor {floor || '–'}.
          </p>
        )}
        <FormError>{create.error ? describeError(create.error) : null}</FormError>
      </form>
    </Overlay>
  );
}

function EditRoomDialog({ room, onClose }: { room: Room | null; onClose: () => void }) {
  const update = useUpdateRoom();
  const toast = useToast();
  const [number, setNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [outOfOrder, setOutOfOrder] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!room) return;
    setNumber(room.number);
    setFloor(String(room.floor));
    setOutOfOrder(room.isOutOfOrder);
    setReason(room.outOfOrderReason ?? '');
    update.reset();
  }, [room?.id]);

  if (!room) return null;

  const valid = number.trim() && /^\d{1,3}$/.test(floor);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!room || !valid) return;
    update.mutate(
      {
        roomId: room.id,
        update: {
          number: number.trim(),
          floor: Number(floor),
          isOutOfOrder: outOfOrder,
          outOfOrderReason: outOfOrder ? reason.trim() || null : null,
        },
      },
      {
        onSuccess: () => {
          toast.show(`Room ${number.trim()} saved`);
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
          <Button variant="primary" type="submit" form="edit-room" pending={update.isPending} disabled={!valid}>
            Save
          </Button>
        </>
      }
    >
      <form id="edit-room" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Room number">
            <Input value={number} maxLength={10} onChange={(event) => setNumber(event.target.value)} data-autofocus />
          </Field>
          <Field label="Floor">
            <Input inputMode="numeric" value={floor} onChange={(event) => setFloor(event.target.value.replace(/\D/g, ''))} />
          </Field>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-md border border-line px-3.5 py-3">
          <div>
            <p className="text-[13px] font-medium text-ink">Out of order</p>
            <p className="text-xs text-ink-3">The room cannot be checked into while out of order.</p>
          </div>
          <Switch checked={outOfOrder} onChange={setOutOfOrder} label="Out of order" />
        </div>
        {outOfOrder && (
          <Field label="Reason" optional hint="Shown to reception, e.g. “AC repair”.">
            <Input value={reason} maxLength={120} onChange={(event) => setReason(event.target.value)} />
          </Field>
        )}
        <FormError>{update.error ? describeError(update.error) : null}</FormError>
      </form>
    </Overlay>
  );
}
