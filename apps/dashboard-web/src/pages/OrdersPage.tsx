import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input } from '../components/ui/Field';
import { EmptyState, ErrorState, LoadingRows, PageHeader, Panel, table } from '../components/ui/Page';
import { Segmented } from '../components/ui/Segmented';
import { ORDER_STATUS_LABEL, OrderStatusLabel } from '../components/ui/Status';
import { useToast } from '../components/ui/Toast';
import { cx } from '../components/ui/cx';
import { useAuth } from '../features/auth/AuthProvider';
import { useHotelLocale } from '../features/hotel/useHotel';
import { averageAcceptMilliseconds, useOrders, useUpdateOrderStatus } from '../features/orders/api';
import { OrderCard, PaymentTag } from '../features/orders/OrderCard';
import { CancelOrderDialog, RecordPaymentDialog, type OrderRef } from '../features/orders/OrderDialogs';
import { OrderDrawer } from '../features/orders/OrderDrawer';
import { useRealtime } from '../features/realtime/RealtimeProvider';
import type { Order, OrderStatus } from '../lib/api-types';
import { describeError } from '../lib/error-handler';
import { formatAge, formatCharge, formatDuration, formatOrderNumber, summarizeItems } from '../lib/format';
import { Permission } from '../lib/permissions';
import { useNow } from '../lib/use-now';

const COLUMNS: OrderStatus[] = ['PENDING', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED'];

/** Oldest first while work is open, newest first once it is done. */
function sortForColumn(status: OrderStatus, orders: Order[]): Order[] {
  const byTime = (order: Order) => new Date(status === 'PENDING' || status === 'IN_PROGRESS' ? order.createdAt : order.updatedAt).getTime();
  const open = status === 'PENDING' || status === 'IN_PROGRESS';
  return [...orders].sort((a, b) => (open ? byTime(a) - byTime(b) : byTime(b) - byTime(a)));
}

export function OrdersPage() {
  const { can } = useAuth();
  const { currency, timeZone } = useHotelLocale();
  const { latestOrder, dismissLatestOrder } = useRealtime();
  const orders = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const toast = useToast();
  const now = useNow(1000);
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState('');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [cancelling, setCancelling] = useState<OrderRef | null>(null);
  const [paying, setPaying] = useState<OrderRef | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const canRecordPayments = can(Permission.RECORD_PAYMENTS);
  const openOrderId = params.get('order');

  const openOrder = (orderId: string | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (orderId) next.set('order', orderId);
        else next.delete('order');
        return next;
      },
      { replace: !orderId },
    );

  const visible = useMemo(() => {
    const query = filter.trim().toLowerCase().replace(/^a-/, '');
    if (!query) return orders.data ?? [];
    return (orders.data ?? []).filter(
      (order) => order.roomNumber.toLowerCase().includes(query) || String(order.number).includes(query),
    );
  }, [orders.data, filter]);

  const byStatus = useMemo(() => {
    const groups = Object.fromEntries(COLUMNS.map((status) => [status, [] as Order[]])) as Record<OrderStatus, Order[]>;
    visible.forEach((order) => groups[order.status].push(order));
    COLUMNS.forEach((status) => (groups[status] = sortForColumn(status, groups[status])));
    return groups;
  }, [visible]);

  const open = (orders.data ?? []).filter((order) => order.status === 'PENDING' || order.status === 'IN_PROGRESS').length;
  const averageAccept = orders.data ? averageAcceptMilliseconds(orders.data) : null;

  const advance = (order: Order, status: 'IN_PROGRESS' | 'DELIVERED') => {
    setBusyOrderId(order.id);
    updateStatus.mutate(
      { orderId: order.id, change: { status } },
      {
        onSuccess: () => toast.show(`Order ${formatOrderNumber(order.number)} ${status === 'IN_PROGRESS' ? 'accepted' : 'delivered'}`),
        onError: (caught) => toast.error(describeError(caught)),
        onSettled: () => setBusyOrderId(null),
      },
    );
  };

  const cardHandlers = (order: Order) => ({
    onOpen: () => openOrder(order.id),
    onAccept: () => advance(order, 'IN_PROGRESS'),
    onDeliver: () => advance(order, 'DELIVERED'),
    onCancel: () => setCancelling(order),
    onRecordPayment: () => setPaying(order),
  });

  return (
    <>
      <PageHeader
        title="Live orders"
        description={
          orders.data
            ? [
                `${open} open`,
                `${orders.data.length} in the last 24 hours`,
                averageAccept !== null ? `average time to accept ${formatDuration(averageAccept)}` : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : 'Orders placed from guest rooms appear here as they arrive.'
        }
        actions={
          <Segmented
            label="Layout"
            value={view}
            onChange={setView}
            options={[
              { value: 'board', label: 'Board' },
              { value: 'list', label: 'List' },
            ]}
          />
        }
      />

      {latestOrder && (
        <div
          role="status"
          className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-notice-line bg-notice px-4 py-2.5 text-[13px]"
        >
          <span className="font-medium text-ink">New order from Room {latestOrder.roomNumber}</span>
          <span className="min-w-0 flex-1 truncate text-ink-2">{latestOrder.itemsSummary}</span>
          <button
            type="button"
            className="font-medium text-ink underline underline-offset-2"
            onClick={() => {
              openOrder(latestOrder.orderId);
              dismissLatestOrder();
            }}
          >
            View order
          </button>
          <button type="button" aria-label="Dismiss" onClick={dismissLatestOrder} className="rounded p-0.5 text-ink-3 hover:text-ink">
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      )}

      <div className="mb-4 max-w-xs">
        <label className="relative block">
          <span className="sr-only">Filter by room or order number</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" strokeWidth={1.75} />
          <Input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Room or order number"
            className="pl-9"
          />
        </label>
      </div>

      {orders.isPending && <LoadingRows rows={6} label="Loading orders" />}
      {orders.error && !orders.data && (
        <Panel>
          <ErrorState message={describeError(orders.error)} onRetry={() => void orders.refetch()} />
        </Panel>
      )}

      {orders.data && view === 'board' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((status) => (
            <section key={status} aria-label={ORDER_STATUS_LABEL[status]} className="min-w-0 rounded-lg bg-sunken p-2">
              <header className="flex items-center justify-between px-1.5 pb-2 pt-1">
                <OrderStatusLabel status={status} />
                <span className="tabular text-xs text-ink-3">{byStatus[status].length}</span>
              </header>
              <div className="space-y-2">
                {byStatus[status].map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    now={now}
                    currency={currency}
                    canRecordPayments={canRecordPayments}
                    busy={busyOrderId === order.id}
                    {...cardHandlers(order)}
                  />
                ))}
                {byStatus[status].length === 0 && (
                  <p className="px-1.5 py-6 text-center text-xs text-ink-3">
                    {status === 'PENDING' ? 'Nothing waiting' : 'None'}
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {orders.data && view === 'list' && (
        <Panel>
          {visible.length === 0 ? (
            <EmptyState title={filter ? 'No orders match' : 'No orders in the last 24 hours'} />
          ) : (
            <div className={table.wrap}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th}>Order</th>
                    <th className={table.th}>Room</th>
                    <th className={table.th}>Items</th>
                    <th className={table.th}>Status</th>
                    <th className={cx(table.th, 'text-right')}>Total</th>
                    <th className={cx(table.th, 'text-right')}>Placed</th>
                  </tr>
                </thead>
                <tbody className={table.body}>
                  {[...visible]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((order) => (
                      <tr key={order.id} className={cx(table.row, 'cursor-pointer')} onClick={() => openOrder(order.id)}>
                        <td className={table.td}>
                          <button type="button" className="tabular font-medium text-ink hover:underline" onClick={() => openOrder(order.id)}>
                            {formatOrderNumber(order.number)}
                          </button>
                        </td>
                        <td className={table.td}>{order.roomNumber}</td>
                        <td className={cx(table.td, 'max-w-xs truncate')}>{summarizeItems(order.items)}</td>
                        <td className={table.td}>
                          <div className="flex items-center gap-2">
                            <OrderStatusLabel status={order.status} />
                            <PaymentTag order={order} />
                          </div>
                        </td>
                        <td className={cx(table.td, 'tabular text-right text-ink')}>{formatCharge(order.totalAmount, currency)}</td>
                        <td className={cx(table.td, 'tabular text-right')}>{formatAge(order.createdAt, now)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      <OrderDrawer
        orderId={openOrderId}
        currency={currency}
        timeZone={timeZone}
        canRecordPayments={canRecordPayments}
        onClose={() => openOrder(null)}
        onCancel={setCancelling}
        onRecordPayment={setPaying}
      />
      <CancelOrderDialog order={cancelling} onClose={() => setCancelling(null)} />
      <RecordPaymentDialog order={paying} currency={currency} onClose={() => setPaying(null)} />
    </>
  );
}
