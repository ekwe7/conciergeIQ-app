import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Overlay } from '../../../components/ui/Overlay';
import { ErrorState, LoadingRows } from '../../../components/ui/Page';
import { OrderStatusLabel } from '../../../components/ui/Status';
import { useToast } from '../../../components/ui/Toast';
import { cx } from '../../../components/ui/cx';
import type { Order, OrderStatusChange } from '../../../lib/api-types';
import { describeError, isNotFound } from '../../../lib/error-handler';
import {
  PAYMENT_METHOD_LABEL,
  formatAmount,
  formatCharge,
  formatClock,
  formatDuration,
  formatOrderNumber,
} from '../../../lib/format';
import { canBePaid } from '../api';
import { useOrderDetail } from '../useOrderDetail';
import { useUpdateOrderStatus } from '../useUpdateOrderStatus';
import { CancelOrderModal } from './CancelOrderModal';
import { PaymentTag } from './OrderCard';

export interface OrderDetailDrawerProperties {
  orderId?: string | null;
  order?: Order | null;
  open?: boolean;
  isOpen?: boolean;
  currency?: string;
  timeZone?: string;
  canRecordPayments?: boolean;
  hotelId?: string;
  onClose: () => void;
  onCancel?: (orderRecord: Order) => void;
  onRecordPayment?: (orderRecord: Order) => void;
}

export type OrderDetailDrawerProps = OrderDetailDrawerProperties;

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
 * Slide-over drawer (`UI: 04`) displaying complete order details, itemized
 * receipt with highlighted preparation notes, timeline, payment summary, and
 * status lifecycle progression controls.
 */
export function OrderDetailDrawer({
  orderId,
  order: fallbackOrder = null,
  open,
  isOpen,
  currency = 'NGN',
  timeZone,
  canRecordPayments = false,
  hotelId,
  onClose,
  onCancel,
  onRecordPayment,
}: OrderDetailDrawerProperties) {
  const resolvedOrderId = orderId ?? fallbackOrder?.id ?? null;
  const orderDetailQuery = useOrderDetail(resolvedOrderId, hotelId);
  const updateOrderStatusMutation = useUpdateOrderStatus(hotelId);
  const toastNotification = useSafeToast();
  const [internalCancellingOrder, setInternalCancellingOrder] =
    useState<Order | null>(null);

  const isDrawerOpen =
    (open ?? isOpen ?? true) && Boolean(resolvedOrderId || fallbackOrder);

  if (!isDrawerOpen) {
    return null;
  }

  const activeOrder = orderDetailQuery.data ?? fallbackOrder;
  const queryError = orderDetailQuery.error;
  const isInitialLoading = orderDetailQuery.isPending && !activeOrder;

  const isTerminalStatus =
    activeOrder?.status === 'DELIVERED' || activeOrder?.status === 'CANCELLED';
  const isOrderPayable = Boolean(
    activeOrder &&
      canRecordPayments &&
      canBePaid(activeOrder) &&
      onRecordPayment,
  );

  const handleAdvanceOrderStatus = (
    targetStatus: 'IN_PROGRESS' | 'DELIVERED',
  ) => {
    if (!activeOrder) return;
    updateOrderStatusMutation.mutate(
      { orderId: activeOrder.id, change: { status: targetStatus } },
      {
        onSuccess: (updatedOrder) =>
          toastNotification.show(
            `Order ${formatOrderNumber(updatedOrder.number)} ${
              targetStatus === 'IN_PROGRESS' ? 'accepted' : 'delivered'
            }`,
          ),
        onError: (caughtError) =>
          toastNotification.error(describeError(caughtError)),
      },
    );
  };

  const handleOpenCancelModal = (orderToCancel: Order) => {
    if (onCancel) {
      onCancel(orderToCancel);
    } else {
      setInternalCancellingOrder(orderToCancel);
    }
  };

  return (
    <>
      <Overlay
        open
        kind="drawer"
        onClose={onClose}
        title={
          activeOrder
            ? `Order ${formatOrderNumber(activeOrder.number)}`
            : 'Order'
        }
        titleAside={
          activeOrder ? <OrderStatusLabel status={activeOrder.status} /> : null
        }
        description={
          activeOrder
            ? `Room ${activeOrder.roomNumber} · placed ${formatClock(
                activeOrder.createdAt,
                timeZone,
              )}`
            : undefined
        }
        footer={
          activeOrder ? (
            <>
              {activeOrder.status === 'PENDING' && (
                <>
                  <Button
                    variant="danger-quiet"
                    className="mr-auto"
                    onClick={() => handleOpenCancelModal(activeOrder)}
                    disabled={updateOrderStatusMutation.isPending}
                  >
                    Reject Order
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleAdvanceOrderStatus('IN_PROGRESS')}
                    pending={updateOrderStatusMutation.isPending}
                  >
                    Accept Order
                  </Button>
                </>
              )}

              {activeOrder.status === 'IN_PROGRESS' && (
                <>
                  <Button
                    variant="danger-quiet"
                    className="mr-auto"
                    onClick={() => handleOpenCancelModal(activeOrder)}
                    disabled={updateOrderStatusMutation.isPending}
                  >
                    Cancel Order
                  </Button>
                  {isOrderPayable && onRecordPayment && (
                    <Button onClick={() => onRecordPayment(activeOrder)}>
                      Record payment
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    onClick={() => handleAdvanceOrderStatus('DELIVERED')}
                    pending={updateOrderStatusMutation.isPending}
                  >
                    Mark Delivered
                  </Button>
                </>
              )}

              {isTerminalStatus && (
                <>
                  <span
                    data-testid="order-terminal-state"
                    className="mr-auto text-xs text-ink-3"
                  >
                    {activeOrder.status === 'DELIVERED'
                      ? 'Order delivered · Actions disabled'
                      : 'Order cancelled · Actions disabled'}
                  </span>
                  {isOrderPayable && onRecordPayment && (
                    <Button onClick={() => onRecordPayment(activeOrder)}>
                      Record payment
                    </Button>
                  )}
                </>
              )}
            </>
          ) : null
        }
      >
        {isInitialLoading && <LoadingRows rows={5} label="Loading order" />}

        {queryError && !activeOrder && (
          <ErrorState
            message={
              isNotFound(queryError)
                ? 'This order is not available. It may belong to another day.'
                : describeError(queryError)
            }
            onRetry={
              isNotFound(queryError)
                ? undefined
                : () => void orderDetailQuery.refetch()
            }
          />
        )}

        {activeOrder && (
          <div data-testid="order-detail-content" className="space-y-6">
            <section aria-label="Items">
              <ul className="divide-y divide-line rounded-md border border-line">
                {activeOrder.items.map((lineItem, lineIndex) => {
                  const lineTotalAmount =
                    lineItem.unitPrice * lineItem.quantity;

                  return (
                    <li
                      key={`${lineItem.itemId}-${lineIndex}`}
                      data-testid={`order-receipt-item-${lineItem.itemId}`}
                      className="flex gap-3 px-3.5 py-3"
                    >
                      <span className="tabular w-6 shrink-0 text-[13px] font-semibold text-ink-3">
                        {lineItem.quantity}×
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-ink">
                          {lineItem.name}
                        </p>
                        {lineItem.quantity > 1 && (
                          <p
                            data-testid={`order-item-unit-price-${lineItem.itemId}`}
                            className="tabular mt-0.5 text-xs text-ink-3"
                          >
                            {formatCharge(lineItem.unitPrice, currency)} each
                          </p>
                        )}
                        {lineItem.notes && (
                          <p
                            data-testid={`order-item-note-${lineItem.itemId}`}
                            className="mt-1 inline-block rounded bg-notice px-2 py-0.5 text-xs font-medium text-status-pending"
                          >
                            Note: {lineItem.notes}
                          </p>
                        )}
                      </div>
                      <span className="tabular shrink-0 text-[13px] text-ink-2">
                        {formatCharge(lineTotalAmount, currency)}
                      </span>
                    </li>
                  );
                })}
                <li className="flex items-baseline justify-between px-3.5 py-3">
                  <span className="text-[13px] font-medium text-ink">Total</span>
                  <span
                    data-testid="order-receipt-total"
                    className="tabular text-base font-semibold text-ink"
                  >
                    {formatCharge(activeOrder.totalAmount, currency)}
                  </span>
                </li>
              </ul>
            </section>

            {activeOrder.cancelReason && (
              <section aria-label="Cancellation reason">
                <h3 className="text-xs font-medium text-ink-3">
                  Cancellation reason
                </h3>
                <p className="mt-1 text-[13px] text-ink">
                  {activeOrder.cancelReason}
                </p>
              </section>
            )}

            <section aria-label="Payment">
              <h3 className="text-xs font-medium text-ink-3">Payment</h3>
              <div className="mt-1.5 flex items-center gap-2 text-[13px] text-ink">
                {activeOrder.payment ? (
                  <span>
                    {PAYMENT_METHOD_LABEL[activeOrder.payment.method]},{' '}
                    {formatAmount(activeOrder.totalAmount, currency)} at{' '}
                    {formatClock(activeOrder.payment.paidAt, timeZone)}
                  </span>
                ) : activeOrder.totalAmount === 0 ? (
                  <span className="text-ink-2">No charge</span>
                ) : activeOrder.status === 'CANCELLED' ? (
                  <span className="text-ink-2">Not charged</span>
                ) : (
                  <>
                    <span className="text-ink-2">Not paid yet</span>
                    <PaymentTag order={activeOrder} />
                  </>
                )}
              </div>
              {!activeOrder.payment &&
                activeOrder.status === 'PENDING' &&
                activeOrder.totalAmount > 0 && (
                  <p className="mt-1 text-xs text-ink-3">
                    A payment can be recorded once the order is accepted.
                  </p>
                )}
              {!canRecordPayments && canBePaid(activeOrder) && (
                <p className="mt-1 text-xs text-ink-3">
                  Recording a payment needs the Receptionist role or higher.
                </p>
              )}
            </section>

            <section aria-label="Timeline">
              <h3 className="text-xs font-medium text-ink-3">Timeline</h3>
              <OrderTimeline order={activeOrder} timeZone={timeZone} />
            </section>
          </div>
        )}
      </Overlay>

      {internalCancellingOrder && (
        <CancelOrderModal
          order={internalCancellingOrder}
          hotelId={hotelId}
          onClose={() => setInternalCancellingOrder(null)}
        />
      )}
    </>
  );
}

export const OrderDrawer = OrderDetailDrawer;

function describeStatusChange(statusChange: OrderStatusChange): string {
  switch (statusChange.to) {
    case 'PENDING':
      return 'Placed by guest';
    case 'IN_PROGRESS':
      return `Accepted by ${statusChange.changedBy}`;
    case 'DELIVERED':
      return `Delivered by ${statusChange.changedBy}`;
    case 'CANCELLED':
      return `Cancelled by ${statusChange.changedBy}`;
  }
}

function OrderTimeline({
  order,
  timeZone,
}: {
  order: Order;
  timeZone?: string;
}) {
  const statusHistory =
    order.history.length > 0
      ? order.history
      : [
          {
            from: null,
            to: 'PENDING' as const,
            changedBy: 'guest',
            changedAt: order.createdAt,
          },
        ];

  const upcomingStepDescription =
    order.status === 'PENDING'
      ? 'Waiting to be accepted'
      : order.status === 'IN_PROGRESS'
        ? `Deliver to Room ${order.roomNumber}`
        : null;

  return (
    <ol className="mt-2">
      {statusHistory.map((statusChange, stepIndex) => {
        const previousStatusChange = statusHistory[stepIndex - 1];
        const elapsedDurationMs = previousStatusChange
          ? new Date(statusChange.changedAt).getTime() -
            new Date(previousStatusChange.changedAt).getTime()
          : null;
        const isLastCompletedStep =
          stepIndex === statusHistory.length - 1 && !upcomingStepDescription;

        return (
          <li
            key={`${statusChange.to}-${statusChange.changedAt}`}
            className="relative flex gap-3 pb-4"
          >
            <TimelineMarker completed isLastStep={isLastCompletedStep} />
            <div className="flex flex-1 items-baseline justify-between gap-3">
              <p className="text-[13px] text-ink">
                {describeStatusChange(statusChange)}
                {elapsedDurationMs !== null && elapsedDurationMs >= 1000 && (
                  <span className="ml-1.5 text-xs text-ink-3">
                    after {formatDuration(elapsedDurationMs)}
                  </span>
                )}
              </p>
              <span className="tabular shrink-0 text-xs text-ink-3">
                {formatClock(statusChange.changedAt, timeZone)}
              </span>
            </div>
          </li>
        );
      })}
      {upcomingStepDescription && (
        <li className="relative flex gap-3">
          <TimelineMarker completed={false} isLastStep />
          <p className="text-[13px] text-ink-3">{upcomingStepDescription}</p>
        </li>
      )}
    </ol>
  );
}

function TimelineMarker({
  completed,
  isLastStep,
}: {
  completed: boolean;
  isLastStep: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className="relative flex w-3 shrink-0 justify-center pt-1.5"
    >
      <span
        className={cx(
          'h-2 w-2 rounded-full border',
          completed
            ? 'border-ink-2 bg-ink-2'
            : 'border-ink-3 bg-surface',
        )}
      />
      {!isLastStep && (
        <span className="absolute -bottom-4 top-[18px] w-px bg-line-strong" />
      )}
    </span>
  );
}
