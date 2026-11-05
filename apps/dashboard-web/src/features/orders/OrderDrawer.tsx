import { Button } from '../../components/ui/Button';
import { Overlay } from '../../components/ui/Overlay';
import { ErrorState, LoadingRows } from '../../components/ui/Page';
import { OrderStatusLabel } from '../../components/ui/Status';
import { useToast } from '../../components/ui/Toast';
import { cx } from '../../components/ui/cx';
import type { Order, OrderStatusChange } from '../../lib/api-types';
import { describeError, isNotFound } from '../../lib/error-handler';
import { formatAmount, formatClock, formatCharge, formatDuration, formatOrderNumber, PAYMENT_METHOD_LABEL } from '../../lib/format';
import { canBePaid, useOrder, useUpdateOrderStatus } from './api';
import { PaymentTag } from './OrderCard';

interface OrderDrawerProps {
  orderId: string | null;
  currency: string;
  timeZone?: string;
  canRecordPayments: boolean;
  onClose(): void;
  onCancel(order: Order): void;
  onRecordPayment(order: Order): void;
}

export function OrderDrawer({ orderId, currency, timeZone, canRecordPayments, onClose, onCancel, onRecordPayment }: OrderDrawerProps) {
  const { data: order, error, isPending, refetch } = useOrder(orderId);
  const updateStatus = useUpdateOrderStatus();
  const toast = useToast();

  if (!orderId) return null;

  const advance = (next: 'IN_PROGRESS' | 'DELIVERED') => {
    if (!order) return;
    updateStatus.mutate(
      { orderId: order.id, change: { status: next } },
      {
        onSuccess: (updated) =>
          toast.show(`Order ${formatOrderNumber(updated.number)} ${next === 'IN_PROGRESS' ? 'accepted' : 'delivered'}`),
        onError: (caught) => toast.error(describeError(caught)),
      },
    );
  };

  const terminal = order?.status === 'DELIVERED' || order?.status === 'CANCELLED';
  const payable = order && canRecordPayments && canBePaid(order);

  return (
    <Overlay
      open
      kind="drawer"
      onClose={onClose}
      title={order ? `Order ${formatOrderNumber(order.number)}` : 'Order'}
      titleAside={order && <OrderStatusLabel status={order.status} />}
      description={order && `Room ${order.roomNumber} · placed ${formatClock(order.createdAt, timeZone)}`}
      footer={
        order &&
        (!terminal || payable) && (
          <>
            {!terminal && (
              <Button variant="danger-quiet" className="mr-auto" onClick={() => onCancel(order)} disabled={updateStatus.isPending}>
                Cancel order
              </Button>
            )}
            {payable && <Button onClick={() => onRecordPayment(order)}>Record payment</Button>}
            {order.status === 'PENDING' && (
              <Button variant="primary" onClick={() => advance('IN_PROGRESS')} pending={updateStatus.isPending}>
                Accept
              </Button>
            )}
            {order.status === 'IN_PROGRESS' && (
              <Button variant="primary" onClick={() => advance('DELIVERED')} pending={updateStatus.isPending}>
                Mark delivered
              </Button>
            )}
          </>
        )
      }
    >
      {isPending && !order && <LoadingRows rows={5} label="Loading order" />}
      {error && !order && (
        <ErrorState
          message={isNotFound(error) ? 'This order is not available. It may belong to another day.' : describeError(error)}
          onRetry={isNotFound(error) ? undefined : () => void refetch()}
        />
      )}
      {order && (
        <div className="space-y-6">
          <section aria-label="Items">
            <ul className="divide-y divide-line rounded-md border border-line">
              {order.items.map((item, index) => (
                <li key={`${item.itemId}-${index}`} className="flex gap-3 px-3.5 py-3">
                  <span className="tabular w-6 shrink-0 text-[13px] text-ink-3">{item.quantity}×</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-ink">{item.name}</p>
                    {item.notes && <p className="mt-0.5 text-xs text-ink-2">Note: {item.notes}</p>}
                  </div>
                  <span className="tabular shrink-0 text-[13px] text-ink-2">
                    {formatCharge(item.unitPrice * item.quantity, currency)}
                  </span>
                </li>
              ))}
              <li className="flex items-baseline justify-between px-3.5 py-3">
                <span className="text-[13px] font-medium text-ink">Total</span>
                <span className="tabular text-base font-semibold text-ink">{formatCharge(order.totalAmount, currency)}</span>
              </li>
            </ul>
          </section>

          {order.cancelReason && (
            <section>
              <h3 className="text-xs font-medium text-ink-3">Cancellation reason</h3>
              <p className="mt-1 text-[13px] text-ink">{order.cancelReason}</p>
            </section>
          )}

          <section>
            <h3 className="text-xs font-medium text-ink-3">Payment</h3>
            <div className="mt-1.5 flex items-center gap-2 text-[13px] text-ink">
              {order.payment ? (
                <span>
                  {PAYMENT_METHOD_LABEL[order.payment.method]}, {formatAmount(order.totalAmount, currency)} at{' '}
                  {formatClock(order.payment.paidAt, timeZone)}
                </span>
              ) : order.totalAmount === 0 ? (
                <span className="text-ink-2">No charge</span>
              ) : order.status === 'CANCELLED' ? (
                <span className="text-ink-2">Not charged</span>
              ) : (
                <>
                  <span className="text-ink-2">Not paid yet</span>
                  <PaymentTag order={order} />
                </>
              )}
            </div>
            {!order.payment && order.status === 'PENDING' && order.totalAmount > 0 && (
              <p className="mt-1 text-xs text-ink-3">A payment can be recorded once the order is accepted.</p>
            )}
            {!canRecordPayments && canBePaid(order) && (
              <p className="mt-1 text-xs text-ink-3">Recording a payment needs the Receptionist role or higher.</p>
            )}
          </section>

          <section>
            <h3 className="text-xs font-medium text-ink-3">Timeline</h3>
            <Timeline order={order} timeZone={timeZone} />
          </section>
        </div>
      )}
    </Overlay>
  );
}

function describeChange(change: OrderStatusChange): string {
  switch (change.to) {
    case 'PENDING':
      return 'Placed by guest';
    case 'IN_PROGRESS':
      return `Accepted by ${change.changedBy}`;
    case 'DELIVERED':
      return `Delivered by ${change.changedBy}`;
    case 'CANCELLED':
      return `Cancelled by ${change.changedBy}`;
  }
}

function Timeline({ order, timeZone }: { order: Order; timeZone?: string }) {
  const history = order.history.length
    ? order.history
    : [{ from: null, to: 'PENDING' as const, changedBy: 'guest', changedAt: order.createdAt }];
  const next =
    order.status === 'PENDING' ? 'Waiting to be accepted' : order.status === 'IN_PROGRESS' ? `Deliver to Room ${order.roomNumber}` : null;

  return (
    <ol className="mt-2">
      {history.map((change, index) => {
        const previous = history[index - 1];
        const took = previous ? new Date(change.changedAt).getTime() - new Date(previous.changedAt).getTime() : null;
        return (
          <li key={`${change.to}-${change.changedAt}`} className="relative flex gap-3 pb-4">
            <TimelineMark done last={index === history.length - 1 && !next} />
            <div className="flex flex-1 items-baseline justify-between gap-3">
              <p className="text-[13px] text-ink">
                {describeChange(change)}
                {took !== null && took >= 1000 && <span className="ml-1.5 text-xs text-ink-3">after {formatDuration(took)}</span>}
              </p>
              <span className="tabular shrink-0 text-xs text-ink-3">{formatClock(change.changedAt, timeZone)}</span>
            </div>
          </li>
        );
      })}
      {next && (
        <li className="relative flex gap-3">
          <TimelineMark done={false} last />
          <p className="text-[13px] text-ink-3">{next}</p>
        </li>
      )}
    </ol>
  );
}

function TimelineMark({ done, last }: { done: boolean; last: boolean }) {
  return (
    <span aria-hidden="true" className="relative flex w-3 shrink-0 justify-center pt-1.5">
      <span className={cx('h-2 w-2 rounded-full border', done ? 'border-ink-2 bg-ink-2' : 'border-ink-3 bg-surface')} />
      {!last && <span className="absolute -bottom-4 top-[18px] w-px bg-line-strong" />}
    </span>
  );
}
