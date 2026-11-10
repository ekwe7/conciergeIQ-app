import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Tag } from '../../../components/ui/Status';
import { cx } from '../../../components/ui/cx';
import type { Order, OrderStatus } from '../../../lib/api-types';
import {
  PAYMENT_METHOD_LABEL,
  formatCharge,
  formatOrderNumber,
  summarizeItems,
} from '../../../lib/format';
import {
  isOrderCurrentlyFlashing,
  subscribeToSoundAlertState,
} from '../../../lib/sound';
import { useNow } from '../../../lib/use-now';
import { canBePaid } from '../api';

/** Pending this long is shown with an overdue border highlight. */
export const SLOW_TO_ACCEPT_MS = 3 * 60_000;

/** 10 minutes elapsed turns the timer badge amber. */
export const AMBER_WARNING_THRESHOLD_MS = 10 * 60_000;

/** 20 minutes elapsed turns the timer badge red. */
export const RED_CRITICAL_THRESHOLD_MS = 20 * 60_000;

export type OrderElapsedUrgency = 'normal' | 'amber' | 'red';

/**
 * Formats an elapsed timestamp into a concise badge string (e.g. "just now", "3m ago", "12m ago", "2h ago").
 */
export function formatElapsedMinutesBadge(
  referenceTimestampIso: string,
  currentTimestampMs: number = Date.now(),
): string {
  const elapsedMilliseconds = Math.max(
    0,
    currentTimestampMs - new Date(referenceTimestampIso).getTime(),
  );
  const elapsedMinutes = Math.floor(elapsedMilliseconds / 60_000);
  if (elapsedMinutes < 1) {
    return 'just now';
  }
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  return `${elapsedHours}h ago`;
}

/**
 * Determines the visual urgency level for an order's elapsed timer badge:
 * - Active orders (`PENDING`, `IN_PROGRESS`) turn `amber` at 10m and `red` at 20m.
 * - Completed or cancelled orders remain `normal`.
 */
export function getOrderElapsedUrgency(
  orderStatus: OrderStatus,
  referenceTimestampIso: string,
  currentTimestampMs: number = Date.now(),
): OrderElapsedUrgency {
  const isActiveOrder =
    orderStatus === 'PENDING' || orderStatus === 'IN_PROGRESS';
  if (!isActiveOrder) {
    return 'normal';
  }

  const elapsedMilliseconds = Math.max(
    0,
    currentTimestampMs - new Date(referenceTimestampIso).getTime(),
  );
  if (elapsedMilliseconds >= RED_CRITICAL_THRESHOLD_MS) {
    return 'red';
  }
  if (elapsedMilliseconds >= AMBER_WARNING_THRESHOLD_MS) {
    return 'amber';
  }
  return 'normal';
}

export interface OrderCardProperties {
  order: Order;
  now?: number;
  currency?: string;
  canRecordPayments?: boolean;
  busy?: boolean;
  isSelected?: boolean;
  isFlashing?: boolean;
  onSelectOrder?: (orderId: string) => void;
  onSelect?: (orderId: string) => void;
  onClick?: (orderId: string) => void;
  onOpen?: () => void;
  onAccept?: () => void;
  onDeliver?: () => void;
  onCancel?: () => void;
  onRecordPayment?: () => void;
}

export type OrderCardProps = OrderCardProperties;

export function OrderCard({
  order,
  now,
  currency = 'NGN',
  canRecordPayments = false,
  busy = false,
  isSelected = false,
  isFlashing,
  onSelectOrder,
  onSelect,
  onClick,
  onOpen,
  onAccept,
  onDeliver,
  onCancel,
  onRecordPayment,
}: OrderCardProperties) {
  const minuteTickTimestamp = useNow(60_000);
  const currentTimestampMs = now ?? minuteTickTimestamp;
  const [isSubscribedFlashing, setIsSubscribedFlashing] = useState<boolean>(() =>
    isOrderCurrentlyFlashing(order.id),
  );

  useEffect(() => {
    setIsSubscribedFlashing(isOrderCurrentlyFlashing(order.id));
    return subscribeToSoundAlertState((updatedSnapshot) => {
      setIsSubscribedFlashing(updatedSnapshot.flashingOrderIds.has(order.id));
    });
  }, [order.id]);

  const isCardFlashing = Boolean(isFlashing || isSubscribedFlashing);

  const isPendingOrder = order.status === 'PENDING';
  const referenceTimestampIso =
    order.status === 'PENDING' || order.status === 'IN_PROGRESS'
      ? order.createdAt
      : order.updatedAt;

  const isSlowToAccept =
    isPendingOrder &&
    currentTimestampMs - new Date(order.createdAt).getTime() > SLOW_TO_ACCEPT_MS;

  const elapsedUrgency = getOrderElapsedUrgency(
    order.status,
    referenceTimestampIso,
    currentTimestampMs,
  );
  const elapsedBadgeText = formatElapsedMinutesBadge(
    referenceTimestampIso,
    currentTimestampMs,
  );

  const accessibleCardLabel = `Room ${order.roomNumber}, order ${formatOrderNumber(order.number)}`;

  const handleCardSelection = () => {
    onSelectOrder?.(order.id);
    onSelect?.(order.id);
    onClick?.(order.id);
    onOpen?.();
  };

  return (
    <article
      aria-label={accessibleCardLabel}
      data-testid={`order-card-${order.id}`}
      data-selected={isSelected ? 'true' : 'false'}
      data-flashing={isCardFlashing ? 'true' : 'false'}
      data-urgency={elapsedUrgency}
      className={cx(
        'group rounded-md border bg-surface transition-colors',
        isCardFlashing && 'animate-pulse-border border-accent ring-1 ring-accent',
        isSelected
          ? 'border-ink ring-1 ring-ink'
          : elapsedUrgency === 'red'
            ? 'border-danger/50'
            : elapsedUrgency === 'amber' || isSlowToAccept
              ? 'border-pending-line'
              : 'border-line hover:border-line-strong',
      )}
    >
      <button
        type="button"
        onClick={handleCardSelection}
        className="block w-full px-3.5 pb-2.5 pt-3 text-left"
        aria-label={`Open ${accessibleCardLabel}`}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-ink">
            Room {order.roomNumber}
            <span className="tabular ml-2 text-xs font-normal text-ink-3">
              {formatOrderNumber(order.number)}
            </span>
          </p>
          <span
            data-testid={`order-elapsed-${order.id}`}
            data-urgency={elapsedUrgency}
            className={cx(
              'tabular shrink-0 rounded px-1.5 py-0.5 text-xs',
              elapsedUrgency === 'red'
                ? 'bg-danger-soft font-semibold text-danger'
                : elapsedUrgency === 'amber' || isSlowToAccept
                  ? 'bg-notice font-medium text-status-pending'
                  : 'text-ink-3',
            )}
          >
            {elapsedBadgeText}
          </span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-[13px] text-ink-2">
          {summarizeItems(order.items)}
        </p>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <p className="tabular text-[13px] font-medium text-ink">
            {formatCharge(order.totalAmount, currency)}
          </p>
          <PaymentTag order={order} />
        </div>
        {order.status === 'CANCELLED' && order.cancelReason && (
          <p className="mt-1.5 text-xs text-ink-3">
            Reason: {order.cancelReason}
          </p>
        )}
      </button>

      {order.status === 'PENDING' && (onAccept || onCancel) && (
        <div className="flex gap-2 border-t border-line px-3.5 py-2.5">
          {onCancel && (
            <Button
              size="sm"
              variant="ghost"
              className="text-danger hover:text-danger"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </Button>
          )}
          {onAccept && (
            <Button
              size="sm"
              variant="primary"
              className="flex-1"
              onClick={onAccept}
              pending={busy}
            >
              Accept
            </Button>
          )}
        </div>
      )}

      {order.status === 'IN_PROGRESS' && onDeliver && (
        <div className="flex gap-2 border-t border-line px-3.5 py-2.5">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={onDeliver}
            pending={busy}
          >
            Mark delivered
          </Button>
        </div>
      )}

      {order.status === 'DELIVERED' &&
        canRecordPayments &&
        canBePaid(order) &&
        onRecordPayment && (
          <div className="border-t border-line px-3.5 py-2.5">
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={onRecordPayment}
            >
              Record payment
            </Button>
          </div>
        )}
    </article>
  );
}

export function PaymentTag({
  order,
}: {
  order: Pick<Order, 'status' | 'payment' | 'totalAmount'>;
}) {
  if (order.status === 'CANCELLED' || order.totalAmount === 0) return null;
  if (order.payment) {
    return <Tag>Paid · {PAYMENT_METHOD_LABEL[order.payment.method]}</Tag>;
  }
  if (order.status === 'DELIVERED') {
    return <Tag emphasis>Unpaid</Tag>;
  }
  return null;
}
