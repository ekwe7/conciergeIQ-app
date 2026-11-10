import { Value } from '@conciergeiq/contracts';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../../components/ui/Button';
import { Field, FormError, Textarea } from '../../../components/ui/Field';
import { Overlay } from '../../../components/ui/Overlay';
import { useToast } from '../../../components/ui/Toast';
import type { Order } from '../../../lib/api-types';
import { describeError } from '../../../lib/error-handler';
import { formatOrderNumber } from '../../../lib/format';
import {
  UpdateOrderStatusSchema,
  useUpdateOrderStatus,
  validateOrderStatusUpdate,
} from '../useUpdateOrderStatus';

export { UpdateOrderStatusSchema, validateOrderStatusUpdate };

export interface OrderReference {
  id: string;
  number: number;
  roomNumber: string;
  totalAmount?: number;
}

export type OrderRef = OrderReference;

export const CANCELLATION_QUICK_REASONS: readonly string[] = [
  'Item not available',
  'Guest changed their mind',
  'Duplicate order',
  'Kitchen closed',
];

export interface CancelOrderModalProperties {
  order?: OrderReference | null;
  orderId?: string | null;
  orderNumber?: number;
  roomNumber?: string;
  open?: boolean;
  isOpen?: boolean;
  hotelId?: string;
  onClose: () => void;
  onConfirm?: (cancellationReason: string) => void;
  onSuccess?: (cancelledOrder: Order) => void;
}

export type CancelOrderModalProps = CancelOrderModalProperties;

function useSafeToast() {
  try {
    return useToast();
  } catch {
    return {
      show: (_message: string) => undefined,
      error: (_message: string) => undefined,
    };
  }
}

/**
 * Modal dialog requiring a non-empty cancellation reason validated against
 * `UpdateOrderStatusSchema` before dispatching `PATCH /api/v1/orders/:orderId/status`.
 */
export function CancelOrderModal({
  order,
  orderId,
  orderNumber,
  roomNumber,
  open,
  isOpen,
  hotelId,
  onClose,
  onConfirm,
  onSuccess,
}: CancelOrderModalProperties) {
  const [cancellationReason, setCancellationReason] = useState('');
  const [validationErrorMessage, setValidationErrorMessage] = useState<
    string | null
  >(null);
  const updateOrderStatusMutation = useUpdateOrderStatus(hotelId);
  const toastNotification = useSafeToast();

  const resolvedOrderId = order?.id ?? orderId ?? null;
  const resolvedOrderNumber = order?.number ?? orderNumber;
  const resolvedRoomNumber = order?.roomNumber ?? roomNumber;

  const isModalOpen =
    (open ?? isOpen ?? true) && Boolean(resolvedOrderId);

  useEffect(() => {
    if (resolvedOrderId) {
      setCancellationReason('');
      setValidationErrorMessage(null);
      updateOrderStatusMutation.reset();
    }
  }, [resolvedOrderId]);

  if (!isModalOpen || !resolvedOrderId) {
    return null;
  }

  const trimmedReason = cancellationReason.trim();
  const isReasonValidAccordingToSchema = Value.Check(UpdateOrderStatusSchema, {
    status: 'CANCELLED',
    reason: trimmedReason,
  });

  const formattedOrderLabel =
    resolvedOrderNumber !== undefined
      ? formatOrderNumber(resolvedOrderNumber)
      : resolvedOrderId;

  const handleSelectQuickReason = (selectedPresetReason: string) => {
    setCancellationReason(selectedPresetReason);
    setValidationErrorMessage(null);
  };

  const handleReasonInputChange = (updatedReasonValue: string) => {
    setCancellationReason(updatedReasonValue);
    if (validationErrorMessage && updatedReasonValue.trim().length > 0) {
      setValidationErrorMessage(null);
    }
  };

  const handleFormSubmit = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();

    const validationResult = validateOrderStatusUpdate({
      status: 'CANCELLED',
      reason: cancellationReason,
    });

    if (!validationResult.isValid || validationResult.payload.status !== 'CANCELLED') {
      setValidationErrorMessage(
        validationResult.isValid
          ? 'A cancellation reason is required.'
          : validationResult.errorMessage,
      );
      return;
    }

    setValidationErrorMessage(null);
    const validatedReason = validationResult.payload.reason;
    onConfirm?.(validatedReason);

    updateOrderStatusMutation.mutate(
      {
        orderId: resolvedOrderId,
        change: { status: 'CANCELLED', reason: validatedReason },
      },
      {
        onSuccess: (cancelledOrder) => {
          toastNotification.show(`Order ${formattedOrderLabel} cancelled`);
          onSuccess?.(cancelledOrder);
          onClose();
        },
      },
    );
  };

  const dialogDescription = resolvedRoomNumber
    ? `Room ${resolvedRoomNumber}. The guest will see that it was cancelled.`
    : 'The guest will see that this order was cancelled.';

  return (
    <Overlay
      open
      onClose={onClose}
      width="sm"
      title={`Cancel order ${formattedOrderLabel}`}
      description={dialogDescription}
      footer={
        <>
          <Button onClick={onClose}>Keep order</Button>
          <Button
            variant="danger"
            type="submit"
            form="cancel-order"
            pending={updateOrderStatusMutation.isPending}
            disabled={!isReasonValidAccordingToSchema}
          >
            Cancel order
          </Button>
        </>
      }
    >
      <form
        id="cancel-order"
        data-testid="cancel-order-form"
        onSubmit={handleFormSubmit}
        noValidate
        className="space-y-4"
      >
        <div
          role="group"
          aria-label="Common cancellation reasons"
          className="flex flex-wrap gap-1.5"
        >
          {CANCELLATION_QUICK_REASONS.map((presetReason) => (
            <button
              key={presetReason}
              type="button"
              aria-pressed={cancellationReason === presetReason}
              onClick={() => handleSelectQuickReason(presetReason)}
              className="rounded border border-line-strong px-2.5 py-1 text-xs text-ink-2 hover:bg-sunken aria-pressed:border-ink aria-pressed:text-ink"
            >
              {presetReason}
            </button>
          ))}
        </div>

        <Field
          label="Reason"
          hint="Kept in the activity log."
          error={validationErrorMessage}
        >
          <Textarea
            value={cancellationReason}
            maxLength={255}
            placeholder="Explain why this order is being cancelled"
            onChange={(changeEvent) =>
              handleReasonInputChange(changeEvent.target.value)
            }
            data-autofocus
          />
        </Field>

        <FormError>
          {updateOrderStatusMutation.error
            ? describeError(updateOrderStatusMutation.error)
            : null}
        </FormError>
      </form>
    </Overlay>
  );
}

export const CancelOrderDialog = CancelOrderModal;
