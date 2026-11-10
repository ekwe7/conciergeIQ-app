import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, FormError, Input } from '../../components/ui/Field';
import { Overlay } from '../../components/ui/Overlay';
import { Segmented } from '../../components/ui/Segmented';
import { useToast } from '../../components/ui/Toast';
import type { PaymentMethod } from '../../lib/api-types';
import { describeError } from '../../lib/error-handler';
import {
  PAYMENT_METHOD_LABEL,
  formatAmount,
  formatOrderNumber,
} from '../../lib/format';
import { useRecordPayment } from './api';
import {
  CANCELLATION_QUICK_REASONS,
  CancelOrderDialog,
  CancelOrderModal,
  UpdateOrderStatusSchema,
  validateOrderStatusUpdate,
  type CancelOrderModalProperties,
  type CancelOrderModalProps,
  type OrderRef,
  type OrderReference,
} from './components/CancelOrderModal';

export {
  CANCELLATION_QUICK_REASONS,
  CancelOrderDialog,
  CancelOrderModal,
  UpdateOrderStatusSchema,
  validateOrderStatusUpdate,
  type CancelOrderModalProperties,
  type CancelOrderModalProps,
  type OrderRef,
  type OrderReference,
};

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');
  const [paymentReference, setPaymentReference] = useState('');
  const recordPaymentMutation = useRecordPayment();
  const toastNotification = useToast();

  useEffect(() => {
    if (order) {
      setPaymentMethod('CARD');
      setPaymentReference('');
      recordPaymentMutation.reset();
    }
  }, [order?.id]);

  if (!order) return null;

  const orderTotalAmount = order.totalAmount ?? 0;

  function handleFormSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (!order) return;
    recordPaymentMutation.mutate(
      {
        orderId: order.id,
        method: paymentMethod,
        reference:
          paymentMethod === 'CASH' ? undefined : paymentReference.trim(),
      },
      {
        onSuccess: () => {
          toastNotification.show(
            `Payment recorded for ${formatOrderNumber(order.number)}`,
          );
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
          <Button
            variant="primary"
            type="submit"
            form="record-payment"
            pending={recordPaymentMutation.isPending}
          >
            Record {formatAmount(orderTotalAmount, currency)}
          </Button>
        </>
      }
    >
      <form
        id="record-payment"
        onSubmit={handleFormSubmit}
        className="space-y-4"
      >
        <div className="flex items-baseline justify-between border-b border-line pb-3">
          <span className="text-[13px] text-ink-3">Amount</span>
          <span className="tabular text-lg font-semibold text-ink">
            {formatAmount(orderTotalAmount, currency)}
          </span>
        </div>
        <div className="space-y-1.5">
          <p className="text-[13px] font-medium text-ink">Method</p>
          <Segmented
            label="Payment method"
            value={paymentMethod}
            onChange={setPaymentMethod}
            options={(['CASH', 'CARD', 'TRANSFER'] as const).map(
              (methodValue) => ({
                value: methodValue,
                label: PAYMENT_METHOD_LABEL[methodValue],
              }),
            )}
          />
        </div>
        {paymentMethod !== 'CASH' && (
          <Field
            label={
              paymentMethod === 'CARD'
                ? 'Terminal slip number'
                : 'Transfer reference'
            }
            optional
          >
            <Input
              value={paymentReference}
              maxLength={64}
              onChange={(changeEvent) =>
                setPaymentReference(changeEvent.target.value)
              }
            />
          </Field>
        )}
        <FormError>
          {recordPaymentMutation.error
            ? describeError(recordPaymentMutation.error)
            : null}
        </FormError>
      </form>
    </Overlay>
  );
}
