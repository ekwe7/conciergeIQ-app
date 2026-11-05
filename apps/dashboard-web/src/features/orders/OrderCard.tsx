import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Status';
import { cx } from '../../components/ui/cx';
import type { Order } from '../../lib/api-types';
import { formatAge, formatCharge, formatOrderNumber, formatWaiting, PAYMENT_METHOD_LABEL, summarizeItems } from '../../lib/format';
import { canBePaid } from './api';

/** Pending this long is shown as overdue. */
export const SLOW_TO_ACCEPT_MS = 3 * 60_000;

interface OrderCardProps {
  order: Order;
  now: number;
  currency: string;
  canRecordPayments: boolean;
  busy: boolean;
  onOpen(): void;
  onAccept(): void;
  onDeliver(): void;
  onCancel(): void;
  onRecordPayment(): void;
}

export function OrderCard({
  order,
  now,
  currency,
  canRecordPayments,
  busy,
  onOpen,
  onAccept,
  onDeliver,
  onCancel,
  onRecordPayment,
}: OrderCardProps) {
  const pending = order.status === 'PENDING';
  const overdue = pending && now - new Date(order.createdAt).getTime() > SLOW_TO_ACCEPT_MS;
  const label = `Room ${order.roomNumber}, order ${formatOrderNumber(order.number)}`;

  return (
    <article
      aria-label={label}
      className={cx(
        'group rounded-md border bg-surface transition-colors',
        overdue ? 'border-pending-line' : 'border-line hover:border-line-strong',
      )}
    >
      <button type="button" onClick={onOpen} className="block w-full px-3.5 pb-2.5 pt-3 text-left" aria-label={`Open ${label}`}>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-ink">
            Room {order.roomNumber}
            <span className="tabular ml-2 text-xs font-normal text-ink-3">{formatOrderNumber(order.number)}</span>
          </p>
          <p className={cx('tabular shrink-0 text-xs', overdue ? 'font-medium text-status-pending' : 'text-ink-3')}>
            {pending ? `${formatWaiting(order.createdAt, now)} waiting` : formatAge(order.updatedAt, now)}
          </p>
        </div>
        <p className="mt-1.5 line-clamp-2 text-[13px] text-ink-2">{summarizeItems(order.items)}</p>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <p className="tabular text-[13px] font-medium text-ink">{formatCharge(order.totalAmount, currency)}</p>
          <PaymentTag order={order} />
        </div>
        {order.status === 'CANCELLED' && order.cancelReason && (
          <p className="mt-1.5 text-xs text-ink-3">Reason: {order.cancelReason}</p>
        )}
      </button>

      {order.status === 'PENDING' && (
        <div className="flex gap-2 border-t border-line px-3.5 py-2.5">
          <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" className="flex-1" onClick={onAccept} pending={busy}>
            Accept
          </Button>
        </div>
      )}
      {order.status === 'IN_PROGRESS' && (
        <div className="flex gap-2 border-t border-line px-3.5 py-2.5">
          <Button size="sm" variant="secondary" className="flex-1" onClick={onDeliver} pending={busy}>
            Mark delivered
          </Button>
        </div>
      )}
      {order.status === 'DELIVERED' && canRecordPayments && canBePaid(order) && (
        <div className="border-t border-line px-3.5 py-2.5">
          <Button size="sm" variant="secondary" className="w-full" onClick={onRecordPayment}>
            Record payment
          </Button>
        </div>
      )}
    </article>
  );
}

export function PaymentTag({ order }: { order: Pick<Order, 'status' | 'payment' | 'totalAmount'> }) {
  if (order.status === 'CANCELLED' || order.totalAmount === 0) return null;
  if (order.payment) return <Tag>Paid · {PAYMENT_METHOD_LABEL[order.payment.method]}</Tag>;
  if (order.status === 'DELIVERED') return <Tag emphasis>Unpaid</Tag>;
  return null;
}
