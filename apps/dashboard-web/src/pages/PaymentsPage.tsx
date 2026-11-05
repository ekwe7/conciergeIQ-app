import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, LoadingRows, PageHeader, Panel, PanelHeader, Stat, table } from '../components/ui/Page';
import { Segmented } from '../components/ui/Segmented';
import { cx } from '../components/ui/cx';
import { useHotelLocale } from '../features/hotel/useHotel';
import { RecordPaymentDialog, type OrderRef } from '../features/orders/OrderDialogs';
import { useOutstanding, usePayments, usePaymentsSummary, type Period } from '../features/payments/api';
import { describeError } from '../lib/error-handler';
import { formatAmount, formatDateTime, formatOrderNumber, PAYMENT_METHOD_LABEL } from '../lib/format';

const PERIOD_LABEL: Record<Period, string> = { today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days' };

export function PaymentsPage() {
  const { currency, timeZone } = useHotelLocale();
  const [period, setPeriod] = useState<Period>('today');
  const summary = usePaymentsSummary(period);
  const payments = usePayments(period);
  const outstanding = useOutstanding();
  const [paying, setPaying] = useState<OrderRef | null>(null);

  const money = (amount: number) => formatAmount(amount, currency);

  return (
    <>
      <PageHeader
        title="Payments"
        description="Collected at the front desk and recorded against each order."
        actions={
          <Segmented
            label="Period"
            value={period}
            onChange={setPeriod}
            options={(Object.keys(PERIOD_LABEL) as Period[]).map((value) => ({ value, label: PERIOD_LABEL[value] }))}
          />
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          label="Collected"
          value={summary.data ? money(summary.data.collected.total) : '–'}
          detail={summary.data && `${summary.data.collected.count} ${summary.data.collected.count === 1 ? 'payment' : 'payments'}`}
        />
        <Stat label="Cash" value={summary.data ? money(summary.data.byMethod.CASH) : '–'} />
        <Stat label="Card" value={summary.data ? money(summary.data.byMethod.CARD) : '–'} />
        <Stat label="Transfer" value={summary.data ? money(summary.data.byMethod.TRANSFER) : '–'} />
        <Stat
          label="Outstanding"
          value={summary.data ? money(summary.data.outstanding.total) : '–'}
          detail={summary.data && `${summary.data.outstanding.count} delivered, unpaid`}
        />
      </div>
      {summary.error && <p className="-mt-3 mb-6 text-[13px] text-danger">{describeError(summary.error)}</p>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Panel>
          <PanelHeader title="Waiting for payment" description="Delivered orders, all dates" />
          {outstanding.isPending && <LoadingRows rows={3} />}
          {outstanding.error && <ErrorState message={describeError(outstanding.error)} onRetry={() => void outstanding.refetch()} />}
          {outstanding.data?.length === 0 && <EmptyState title="Nothing outstanding">Every delivered order has been paid.</EmptyState>}
          {outstanding.data && outstanding.data.length > 0 && (
            <ul className="divide-y divide-line">
              {outstanding.data.map((order) => (
                <li key={order.orderId} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1 text-[13px]">
                    <p className="font-medium text-ink">Room {order.roomNumber}</p>
                    <p className="tabular text-xs text-ink-3">{formatOrderNumber(order.orderNumber)}</p>
                  </div>
                  <span className="tabular text-[13px] text-ink">{money(order.amount)}</span>
                  <Button
                    size="sm"
                    onClick={() =>
                      setPaying({ id: order.orderId, number: order.orderNumber, roomNumber: order.roomNumber, totalAmount: order.amount })
                    }
                  >
                    Record
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Recorded payments" description={PERIOD_LABEL[period]} />
          {payments.isPending && <LoadingRows rows={4} />}
          {payments.error && <ErrorState message={describeError(payments.error)} onRetry={() => void payments.refetch()} />}
          {payments.data?.length === 0 && <EmptyState title="No payments recorded in this period" />}
          {payments.data && payments.data.length > 0 && (
            <div className={table.wrap}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th}>Time</th>
                    <th className={table.th}>Order</th>
                    <th className={table.th}>Room</th>
                    <th className={table.th}>Method</th>
                    <th className={table.th}>Recorded by</th>
                    <th className={cx(table.th, 'text-right')}>Amount</th>
                  </tr>
                </thead>
                <tbody className={table.body}>
                  {payments.data.map((payment) => (
                    <tr key={payment.id} className={table.row}>
                      <td className={cx(table.td, 'tabular whitespace-nowrap')}>{formatDateTime(payment.recordedAt, timeZone)}</td>
                      <td className={cx(table.td, 'tabular')}>{formatOrderNumber(payment.orderNumber)}</td>
                      <td className={table.td}>{payment.roomNumber}</td>
                      <td className={table.td}>
                        {PAYMENT_METHOD_LABEL[payment.method]}
                        {payment.reference && <span className="ml-1.5 text-xs text-ink-3">{payment.reference}</span>}
                      </td>
                      <td className={table.td}>{payment.recordedBy}</td>
                      <td className={cx(table.td, 'tabular text-right text-ink')}>{money(payment.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <RecordPaymentDialog order={paying} currency={currency} onClose={() => setPaying(null)} />
    </>
  );
}
