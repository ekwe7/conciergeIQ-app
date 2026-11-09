import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input } from '../components/ui/Field';
import { EmptyState, ErrorState, LoadingRows, PageHeader, Panel, table } from '../components/ui/Page';
import { Segmented } from '../components/ui/Segmented';
import { OrderStatusLabel } from '../components/ui/Status';
import { useToast } from '../components/ui/Toast';
import { cx } from '../components/ui/cx';
import { useAuth } from '../features/auth/AuthProvider';
import { useHotelLocale } from '../features/hotel/useHotel';
import {
  ORDER_BOARD_COLUMNS,
  averageAcceptMilliseconds,
  groupOrdersByStatus,
  useHotelOrders,
  useUpdateOrderStatus,
} from '../features/orders/api';
import { CancelOrderDialog, RecordPaymentDialog, type OrderRef } from '../features/orders/OrderDialogs';
import { OrderDrawer } from '../features/orders/OrderDrawer';
import { OrderBoardColumn, PaymentTag } from '../features/orders/components';
import { useRealtime } from '../features/realtime/RealtimeProvider';
import type { Order } from '../lib/api-types';
import { describeError } from '../lib/error-handler';
import { formatAge, formatCharge, formatDuration, formatOrderNumber, summarizeItems } from '../lib/format';
import { Permission } from '../lib/permissions';
import { useNow } from '../lib/use-now';

export function OrdersPage() {
  const { can } = useAuth();
  const { currency, timeZone } = useHotelLocale();
  const { latestOrder, dismissLatestOrder } = useRealtime();
  const hotelOrdersQuery = useHotelOrders();
  const updateOrderStatusMutation = useUpdateOrderStatus();
  const toast = useToast();
  const currentTimestampMs = useNow(60_000);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchFilterQuery, setSearchFilterQuery] = useState('');
  const [layoutViewMode, setLayoutViewMode] = useState<'board' | 'list'>('board');
  const [cancellingOrderReference, setCancellingOrderReference] = useState<OrderRef | null>(null);
  const [payingOrderReference, setPayingOrderReference] = useState<OrderRef | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const canRecordPayments = can(Permission.RECORD_PAYMENTS);
  const selectedOrderId = searchParams.get('order');

  const handleSelectOrder = (orderId: string | null) =>
    setSearchParams(
      (currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        if (orderId) nextParams.set('order', orderId);
        else nextParams.delete('order');
        return nextParams;
      },
      { replace: !orderId },
    );

  const visibleOrders = useMemo(() => {
    const normalizedQuery = searchFilterQuery.trim().toLowerCase().replace(/^a-/, '');
    if (!normalizedQuery) return hotelOrdersQuery.orders;
    return hotelOrdersQuery.orders.filter(
      (orderRecord) =>
        orderRecord.roomNumber.toLowerCase().includes(normalizedQuery) ||
        String(orderRecord.number).includes(normalizedQuery),
    );
  }, [hotelOrdersQuery.orders, searchFilterQuery]);

  const groupedOrdersByStatus = useMemo(
    () => groupOrdersByStatus(visibleOrders),
    [visibleOrders],
  );

  const openOrdersCount = hotelOrdersQuery.orders.filter(
    (orderRecord) =>
      orderRecord.status === 'PENDING' || orderRecord.status === 'IN_PROGRESS',
  ).length;
  const averageAcceptTimeMs = hotelOrdersQuery.data
    ? averageAcceptMilliseconds(hotelOrdersQuery.data)
    : null;

  const advanceOrderStatus = (
    orderRecord: Order,
    nextStatus: 'IN_PROGRESS' | 'DELIVERED',
  ) => {
    setBusyOrderId(orderRecord.id);
    updateOrderStatusMutation.mutate(
      { orderId: orderRecord.id, change: { status: nextStatus } },
      {
        onSuccess: () =>
          toast.show(
            `Order ${formatOrderNumber(orderRecord.number)} ${
              nextStatus === 'IN_PROGRESS' ? 'accepted' : 'delivered'
            }`,
          ),
        onError: (caughtError) => toast.error(describeError(caughtError)),
        onSettled: () => setBusyOrderId(null),
      },
    );
  };

  return (
    <>
      <PageHeader
        title="Live orders"
        description={
          hotelOrdersQuery.data
            ? [
                `${openOrdersCount} open`,
                `${hotelOrdersQuery.data.length} in the last 24 hours`,
                averageAcceptTimeMs !== null
                  ? `average time to accept ${formatDuration(averageAcceptTimeMs)}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : 'Orders placed from guest rooms appear here as they arrive.'
        }
        actions={
          <Segmented
            label="Layout"
            value={layoutViewMode}
            onChange={setLayoutViewMode}
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
          <span className="font-medium text-ink">
            New order from Room {latestOrder.roomNumber}
          </span>
          <span className="min-w-0 flex-1 truncate text-ink-2">
            {latestOrder.itemsSummary}
          </span>
          <button
            type="button"
            className="font-medium text-ink underline underline-offset-2"
            onClick={() => {
              handleSelectOrder(latestOrder.orderId);
              dismissLatestOrder();
            }}
          >
            View order
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismissLatestOrder}
            className="rounded p-0.5 text-ink-3 hover:text-ink"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      )}

      <div className="mb-4 max-w-xs">
        <label className="relative block">
          <span className="sr-only">Filter by room or order number</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
            strokeWidth={1.75}
          />
          <Input
            type="search"
            value={searchFilterQuery}
            onChange={(changeEvent) => setSearchFilterQuery(changeEvent.target.value)}
            placeholder="Room or order number"
            className="pl-9"
          />
        </label>
      </div>

      {hotelOrdersQuery.isPending && <LoadingRows rows={6} label="Loading orders" />}
      {hotelOrdersQuery.error && !hotelOrdersQuery.data && (
        <Panel>
          <ErrorState
            message={describeError(hotelOrdersQuery.error)}
            onRetry={() => void hotelOrdersQuery.refetch()}
          />
        </Panel>
      )}

      {hotelOrdersQuery.data && layoutViewMode === 'board' && (
        <div
          data-testid="orders-kanban-board"
          className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          {ORDER_BOARD_COLUMNS.map((columnStatus) => (
            <OrderBoardColumn
              key={columnStatus}
              status={columnStatus}
              orders={groupedOrdersByStatus[columnStatus]}
              now={currentTimestampMs}
              currency={currency}
              canRecordPayments={canRecordPayments}
              busyOrderId={busyOrderId}
              selectedOrderId={selectedOrderId}
              onSelectOrder={(orderId) => handleSelectOrder(orderId)}
              onAcceptOrder={(orderRecord) =>
                advanceOrderStatus(orderRecord, 'IN_PROGRESS')
              }
              onDeliverOrder={(orderRecord) =>
                advanceOrderStatus(orderRecord, 'DELIVERED')
              }
              onCancelOrder={(orderRecord) => setCancellingOrderReference(orderRecord)}
              onRecordPayment={(orderRecord) => setPayingOrderReference(orderRecord)}
            />
          ))}
        </div>
      )}

      {hotelOrdersQuery.data && layoutViewMode === 'list' && (
        <Panel>
          {visibleOrders.length === 0 ? (
            <EmptyState
              title={
                searchFilterQuery ? 'No orders match' : 'No orders in the last 24 hours'
              }
            />
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
                  {[...visibleOrders]
                    .sort(
                      (firstOrder, secondOrder) =>
                        new Date(secondOrder.createdAt).getTime() -
                        new Date(firstOrder.createdAt).getTime(),
                    )
                    .map((orderRecord) => (
                      <tr
                        key={orderRecord.id}
                        className={cx(table.row, 'cursor-pointer')}
                        onClick={() => handleSelectOrder(orderRecord.id)}
                      >
                        <td className={table.td}>
                          <button
                            type="button"
                            className="tabular font-medium text-ink hover:underline"
                            onClick={() => handleSelectOrder(orderRecord.id)}
                          >
                            {formatOrderNumber(orderRecord.number)}
                          </button>
                        </td>
                        <td className={table.td}>{orderRecord.roomNumber}</td>
                        <td className={cx(table.td, 'max-w-xs truncate')}>
                          {summarizeItems(orderRecord.items)}
                        </td>
                        <td className={table.td}>
                          <div className="flex items-center gap-2">
                            <OrderStatusLabel status={orderRecord.status} />
                            <PaymentTag order={orderRecord} />
                          </div>
                        </td>
                        <td className={cx(table.td, 'tabular text-right text-ink')}>
                          {formatCharge(orderRecord.totalAmount, currency)}
                        </td>
                        <td className={cx(table.td, 'tabular text-right')}>
                          {formatAge(orderRecord.createdAt, currentTimestampMs)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      <OrderDrawer
        orderId={selectedOrderId}
        currency={currency}
        timeZone={timeZone}
        canRecordPayments={canRecordPayments}
        onClose={() => handleSelectOrder(null)}
        onCancel={setCancellingOrderReference}
        onRecordPayment={setPayingOrderReference}
      />
      <CancelOrderDialog
        order={cancellingOrderReference}
        onClose={() => setCancellingOrderReference(null)}
      />
      <RecordPaymentDialog
        order={payingOrderReference}
        currency={currency}
        onClose={() => setPayingOrderReference(null)}
      />
    </>
  );
}
