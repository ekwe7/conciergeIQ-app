import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, FormError, Input, Textarea } from '../../components/ui/Field';
import { Overlay } from '../../components/ui/Overlay';
import { Segmented } from '../../components/ui/Segmented';
import { useToast } from '../../components/ui/Toast';
import type { PaymentMethod } from '../../lib/api-types';
import { describeError } from '../../lib/error-handler';
import { formatAmount, formatOrderNumber, PAYMENT_METHOD_LABEL } from '../../lib/format';
import { useRecordPayment, useUpdateOrderStatus } from './api';

export interface OrderRef {
  id: string;
  number: number;
  roomNumber: string;
  totalAmount: number;
}

const QUICK_REASONS = ['Item not available', 'Guest changed their mind', 'Duplicate order', 'Kitchen closed'];

/** Cancelling needs a reason; the guest sees that the order was cancelled. */
export function CancelOrderDialog({ order, onClose }: { order: OrderRef | null; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const updateStatus = useUpdateOrderStatus();
  const toast = useToast();

  useEffect(() => {
    if (order) {
      setReason('');
      updateStatus.reset();
    }
    // Reset only when a different order is opened.
  }, [order?.id]);

  if (!order) return null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!order || !reason.trim()) return;
    updateStatus.mutate(
      { orderId: order.id, change: { status: 'CANCELLED', reason: reason.trim() } },
      {
        onSuccess: () => {
          toast.show(`Order ${formatOrderNumber(order.number)} cancelled`);
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
      title={`Cancel order ${formatOrderNumber(order.number)}`}
      description={`Room ${order.roomNumber}. The guest will see that it was cancelled.`}
      footer={
        <>
          <Button onClick={onClose}>Keep order</Button>
          <Button variant="danger" type="submit" form="cancel-order" pending={updateStatus.isPending} disabled={!reason.trim()}>
            Cancel order
          </Button>
        </>
      }
    >
      <form id="cancel-order" onSubmit={submit} className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_REASONS.map((quick) => (
            <button
              key={quick}
              type="button"
              aria-pressed={reason === quick}
              onClick={() => setReason(quick)}
              className="rounded border border-line-strong px-2.5 py-1 text-xs text-ink-2 hover:bg-sunken aria-pressed:border-ink aria-pressed:text-ink"
            >
              {quick}
            </button>
          ))}
        </div>
        <Field label="Reason" hint="Kept in the activity log.">
          <Textarea value={reason} maxLength={255} onChange={(event) => setReason(event.target.value)} data-autofocus />
        </Field>
        <FormError>{updateStatus.error ? describeError(updateStatus.error) : null}</FormError>
      </form>
    </Overlay>
  );
}

/** "Mark as paid": records the full order total, collected at the front desk. */
export function RecordPaymentDialog({
  order,
  currency,
  onClose,
}: {
  order: OrderRef | null;
  currency: string;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>('CARD');
  const [reference, setReference] = useState('');
  const recordPayment = useRecordPayment();
  const toast = useToast();

  useEffect(() => {
    if (order) {
      setMethod('CARD');
      setReference('');
      recordPayment.reset();
    }
  }, [order?.id]);

  if (!order) return null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!order) return;
    recordPayment.mutate(
      { orderId: order.id, method, reference: method === 'CASH' ? undefined : reference.trim() },
      {
        onSuccess: () => {
          toast.show(`Payment recorded for ${formatOrderNumber(order.number)}`);
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
      title="Record payment"
      description={`Order ${formatOrderNumber(order.number)}, Room ${order.roomNumber}`}
      footer={
        <>
          <Button onClick={onClose}>Not now</Button>
          <Button variant="primary" type="submit" form="record-payment" pending={recordPayment.isPending}>
            Record {formatAmount(order.totalAmount, currency)}
          </Button>
        </>
      }
    >
      <form id="record-payment" onSubmit={submit} className="space-y-4">
        <div className="flex items-baseline justify-between border-b border-line pb-3">
          <span className="text-[13px] text-ink-3">Amount</span>
          <span className="tabular text-lg font-semibold text-ink">{formatAmount(order.totalAmount, currency)}</span>
        </div>
        <div className="space-y-1.5">
          <p className="text-[13px] font-medium text-ink">
            Method
          </p>
          <Segmented
            label="Payment method"
            value={method}
            onChange={setMethod}
            options={(['CASH', 'CARD', 'TRANSFER'] as const).map((value) => ({ value, label: PAYMENT_METHOD_LABEL[value] }))}
          />
        </div>
        {method !== 'CASH' && (
          <Field label={method === 'CARD' ? 'Terminal slip number' : 'Transfer reference'} optional>
            <Input value={reference} maxLength={64} onChange={(event) => setReference(event.target.value)} />
          </Field>
        )}
        <FormError>{recordPayment.error ? describeError(recordPayment.error) : null}</FormError>
      </form>
    </Overlay>
  );
}
