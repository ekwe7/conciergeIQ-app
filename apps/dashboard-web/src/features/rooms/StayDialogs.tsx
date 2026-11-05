import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, FormError, Input } from '../../components/ui/Field';
import { Overlay } from '../../components/ui/Overlay';
import { ErrorState, LoadingRows } from '../../components/ui/Page';
import { useToast } from '../../components/ui/Toast';
import type { Room, Stay } from '../../lib/api-types';
import { describeError } from '../../lib/error-handler';
import { formatAmount, formatDay, formatOrderNumber } from '../../lib/format';
import { useCheckIn, useCheckOut, useStayBill } from './api';

/** Tomorrow at 12:00 local time, as a value for `<input type="datetime-local">`. */
export function defaultCheckOut(now = new Date()): string {
  const date = new Date(now);
  date.setDate(date.getDate() + 1);
  date.setHours(12, 0, 0, 0);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T12:00`;
}

export function CheckInDialog({ room, onClose }: { room: Room | null; onClose: () => void }) {
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const checkIn = useCheckIn();
  const toast = useToast();

  useEffect(() => {
    if (!room) return;
    setGuestName('');
    setGuestPhone('');
    setCheckOut(defaultCheckOut());
    checkIn.reset();
  }, [room?.id]);

  if (!room) return null;

  const departure = checkOut ? new Date(checkOut) : null;
  const departureError = departure && departure.getTime() <= Date.now() ? 'Departure must be in the future.' : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!room || !guestName.trim() || !departure || departureError) return;
    checkIn.mutate(
      {
        roomId: room.id,
        input: {
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim() || undefined,
          expectedCheckOutAt: departure.toISOString(),
        },
      },
      {
        onSuccess: (stay) => {
          toast.show(`${stay.guestName} checked in to Room ${stay.roomNumber}`);
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
      title={`Check in to Room ${room.number}`}
      description="The room's QR code starts working for this guest straight away."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            form="check-in"
            pending={checkIn.isPending}
            disabled={!guestName.trim() || !departure || Boolean(departureError)}
          >
            Check in
          </Button>
        </>
      }
    >
      <form id="check-in" onSubmit={submit} className="space-y-4">
        <Field label="Guest name">
          <Input value={guestName} maxLength={120} onChange={(event) => setGuestName(event.target.value)} data-autofocus />
        </Field>
        <Field label="Phone" optional>
          <Input type="tel" value={guestPhone} maxLength={30} onChange={(event) => setGuestPhone(event.target.value)} />
        </Field>
        <Field label="Expected departure" error={departureError}>
          <Input type="datetime-local" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} />
        </Field>
        <FormError>{checkIn.error ? describeError(checkIn.error) : null}</FormError>
      </form>
    </Overlay>
  );
}

export function CheckOutDialog({
  stay,
  currency,
  timeZone,
  onClose,
}: {
  stay: Stay | null;
  currency: string;
  timeZone?: string;
  onClose: () => void;
}) {
  const bill = useStayBill(stay?.id ?? null);
  const checkOut = useCheckOut();
  const toast = useToast();

  useEffect(() => {
    if (stay) checkOut.reset();
  }, [stay?.id]);

  if (!stay) return null;

  const confirm = () =>
    checkOut.mutate(stay.id, {
      onSuccess: () => {
        toast.show(`${stay.guestName} checked out of Room ${stay.roomNumber}`);
        onClose();
      },
    });

  const data = bill.data;
  const hasLooseEnds = data && (data.outstanding > 0 || data.openOrders.length > 0);

  return (
    <Overlay
      open
      onClose={onClose}
      width="md"
      title={`Check out Room ${stay.roomNumber}`}
      description={`${stay.guestName} · arrived ${formatDay(stay.checkedInAt, timeZone)}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={confirm} pending={checkOut.isPending} disabled={!data}>
            {hasLooseEnds ? 'Check out anyway' : 'Check out'}
          </Button>
        </>
      }
    >
      {bill.isPending && <LoadingRows rows={3} label="Loading bill" />}
      {bill.error && <ErrorState message={describeError(bill.error)} onRetry={() => void bill.refetch()} />}
      {data && (
        <div className="space-y-5">
          <dl className="divide-y divide-line rounded-md border border-line text-[13px]">
            <BillRow label={`Charged (${data.ordersCount} ${data.ordersCount === 1 ? 'order' : 'orders'})`} value={formatAmount(data.totalCharged, currency)} />
            <BillRow label="Paid" value={formatAmount(data.totalPaid, currency)} />
            <BillRow label="Outstanding" value={formatAmount(data.outstanding, currency)} strong />
          </dl>

          {data.outstanding > 0 && (
            <p className="text-[13px] text-ink-2">
              Collect the outstanding amount before the guest leaves, then record it on the Payments page.
            </p>
          )}

          {data.openOrders.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-ink-3">Orders still open</h3>
              <ul className="mt-1.5 space-y-1 text-[13px]">
                {data.openOrders.map((order) => (
                  <li key={order.orderId} className="flex gap-2">
                    <span className="tabular text-ink-3">{formatOrderNumber(order.orderNumber)}</span>
                    <span className="text-ink">{order.itemsSummary}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ink-3">Checking out does not cancel these orders.</p>
            </div>
          )}

          <p className="text-xs text-ink-3">The room's QR code stops working for this guest when you check out.</p>
          <FormError>{checkOut.error ? describeError(checkOut.error) : null}</FormError>
        </div>
      )}
    </Overlay>
  );
}

function BillRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between px-3.5 py-2.5">
      <dt className={strong ? 'font-medium text-ink' : 'text-ink-2'}>{label}</dt>
      <dd className={strong ? 'tabular font-semibold text-ink' : 'tabular text-ink'}>{value}</dd>
    </div>
  );
}
