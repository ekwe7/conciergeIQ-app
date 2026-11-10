import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { ORDER_STATUS_LABEL, OrderStatusLabel } from '../../../components/ui/Status';
import { cx } from '../../../components/ui/cx';
import type { Order, OrderStatus } from '../../../lib/api-types';
import { OrderCard } from './OrderCard';

export const COLUMN_QUEUE_TITLE: Record<OrderStatus, string> = {
  PENDING: 'New Orders',
  IN_PROGRESS: 'In Progress',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export interface OrderBoardColumnProperties {
  status: OrderStatus;
  orders: Order[];
  now?: number;
  currency?: string;
  canRecordPayments?: boolean;
  busyOrderId?: string | null;
  selectedOrderId?: string | null;
  flashingOrderIds?: ReadonlySet<string>;
  defaultCollapsed?: boolean;
  onSelectOrder?: (orderId: string) => void;
  onAcceptOrder?: (orderRecord: Order) => void;
  onDeliverOrder?: (orderRecord: Order) => void;
  onCancelOrder?: (orderRecord: Order) => void;
  onRecordPayment?: (orderRecord: Order) => void;
}

/**
 * Kanban column for a single order lifecycle status.
 * Uses CSS flexbox with an independent `overflow-y-auto` card container so a rush of
 * incoming orders in one column never scrolls adjacent status columns off-screen.
 * Completed (`DELIVERED`) and cancelled (`CANCELLED`) columns support collapsible styling.
 */
export function OrderBoardColumn({
  status,
  orders,
  now,
  currency = 'NGN',
  canRecordPayments = false,
  busyOrderId = null,
  selectedOrderId = null,
  flashingOrderIds,
  defaultCollapsed = false,
  onSelectOrder,
  onAcceptOrder,
  onDeliverOrder,
  onCancelOrder,
  onRecordPayment,
}: OrderBoardColumnProperties) {
  const isTerminalColumn = status === 'DELIVERED' || status === 'CANCELLED';
  const [isColumnCollapsed, setIsColumnCollapsed] = useState<boolean>(
    isTerminalColumn ? defaultCollapsed : false,
  );

  const statusAccessibleLabel = ORDER_STATUS_LABEL[status];
  const columnQueueTitle = COLUMN_QUEUE_TITLE[status];
  const orderCount = orders.length;

  const handleToggleCollapse = () => {
    if (!isTerminalColumn) return;
    setIsColumnCollapsed((previousCollapsed) => !previousCollapsed);
  };

  return (
    <section
      aria-label={statusAccessibleLabel}
      data-testid={`order-column-${status}`}
      data-collapsed={isColumnCollapsed ? 'true' : 'false'}
      className={cx(
        'flex min-w-0 flex-col rounded-lg bg-sunken p-2 transition-opacity',
        isTerminalColumn && isColumnCollapsed && 'opacity-75',
      )}
    >
      <header className="flex items-center justify-between gap-2 px-1.5 pb-2 pt-1">
        <div className="flex min-w-0 items-center gap-2">
          <OrderStatusLabel status={status} />
          <span
            data-testid={`column-count-badge-${status}`}
            className="rounded-full bg-surface px-2 py-0.5 text-2xs font-medium text-ink-3"
          >
            {columnQueueTitle} ({orderCount})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            data-testid={`column-count-${status}`}
            className="tabular text-xs font-medium text-ink-3"
          >
            {orderCount}
          </span>
          {isTerminalColumn && (
            <button
              type="button"
              onClick={handleToggleCollapse}
              aria-expanded={!isColumnCollapsed}
              aria-label={
                isColumnCollapsed
                  ? `Expand ${statusAccessibleLabel} column`
                  : `Collapse ${statusAccessibleLabel} column`
              }
              className="rounded p-1 text-ink-3 hover:bg-surface hover:text-ink transition-colors"
            >
              {isColumnCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </header>

      {!isColumnCollapsed ? (
        <div
          data-testid={`column-scroll-container-${status}`}
          className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-16rem)] pr-0.5"
        >
          {orders.map((orderRecord) => (
            <OrderCard
              key={orderRecord.id}
              order={orderRecord}
              now={now}
              currency={currency}
              canRecordPayments={canRecordPayments}
              busy={busyOrderId === orderRecord.id}
              isSelected={selectedOrderId === orderRecord.id}
              isFlashing={flashingOrderIds?.has(orderRecord.id)}
              onSelectOrder={onSelectOrder}
              onAccept={onAcceptOrder ? () => onAcceptOrder(orderRecord) : undefined}
              onDeliver={onDeliverOrder ? () => onDeliverOrder(orderRecord) : undefined}
              onCancel={onCancelOrder ? () => onCancelOrder(orderRecord) : undefined}
              onRecordPayment={
                onRecordPayment ? () => onRecordPayment(orderRecord) : undefined
              }
            />
          ))}
          {orders.length === 0 && (
            <p className="px-1.5 py-6 text-center text-xs text-ink-3">
              {status === 'PENDING' ? 'Nothing waiting' : 'None'}
            </p>
          )}
        </div>
      ) : (
        <p className="px-1.5 py-3 text-center text-xs text-ink-3">
          {orderCount} {orderCount === 1 ? 'order' : 'orders'} hidden
        </p>
      )}
    </section>
  );
}
