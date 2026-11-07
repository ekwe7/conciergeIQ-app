import React, { useCallback } from 'react';
import { Badge, Button } from '@conciergeiq/ui';
import { formatMoney, formatDate } from '@conciergeiq/utils';
import { Receipt, Printer, RefreshCw, XCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useStayBill } from '../features/billing/hooks/useStayBill';
import { formatPaymentStatusLabel } from '../features/billing/payment-status';
import { DigitalStayBill, StayBillLineItem } from '../features/billing/types';

interface BillSummaryTileProperties {
  label: string;
  formattedAmount: string;
  testIdentifier: string;
  amountClassName?: string;
}

const BillSummaryTile: React.FC<BillSummaryTileProperties> = ({
  label,
  formattedAmount,
  testIdentifier,
  amountClassName = 'text-text',
}) => (
  <div className="bg-surface rounded-xl p-3 border border-border shadow-elevation-low">
    <dt className="text-[10px] text-text-muted uppercase font-bold tracking-wider truncate">{label}</dt>
    <dd data-testid={testIdentifier} className={`text-sm font-extrabold mt-0.5 ${amountClassName}`}>
      {formattedAmount}
    </dd>
  </div>
);

const BillLineItemRow: React.FC<{ lineItem: StayBillLineItem; currency: string }> = ({
  lineItem,
  currency,
}) => {
  const isPaid: boolean = lineItem.paymentStatus === 'PAID';
  return (
    <li
      data-testid={`folio-line-${lineItem.orderIdentifier}`}
      className="p-3.5 flex items-center justify-between gap-3 text-xs break-inside-avoid"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-text truncate print:whitespace-normal">{lineItem.description}</p>
        <div className="text-[11px] text-text-muted mt-1 flex items-center gap-2">
          <time dateTime={lineItem.dateString}>{formatDate(lineItem.dateString)}</time>
          <Badge variant={isPaid ? 'success' : 'info'} className="text-[10px] font-bold uppercase">
            {formatPaymentStatusLabel(lineItem.paymentStatus)}
          </Badge>
        </div>
      </div>
      <span className="font-bold text-text shrink-0 text-sm">
        {formatMoney(lineItem.amountMinor, currency)}
      </span>
    </li>
  );
};

const DigitalBillContent: React.FC<{ bill: DigitalStayBill; onPrintRequest: () => void }> = ({
  bill,
  onPrintRequest,
}) => {
  const hasOutstandingBalance: boolean = bill.outstandingBalanceMinor > 0;
  const formattedOutstanding: string = formatMoney(bill.outstandingBalanceMinor, bill.currency);

  return (
    <div className="p-4 max-w-lg mx-auto w-full space-y-4 pb-24 print:p-0 print:max-w-none">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text tracking-tight">Digital Folio Bill</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {[bill.hotelName, bill.roomNumber && `Room ${bill.roomNumber}`, bill.guestName]
              .filter(Boolean)
              .join(' • ')}
          </p>
          <p className="hidden print:block text-[11px] text-text-muted mt-1">
            Stay reference {bill.stayIdentifier} • Printed {formatDate(new Date().toISOString())}
          </p>
        </div>
        <Badge variant={hasOutstandingBalance ? 'warning' : 'success'} className="text-xs font-semibold shrink-0">
          {hasOutstandingBalance ? 'Balance due' : 'Paid in full'}
        </Badge>
      </header>

      <section
        aria-labelledby="folio-balance-heading"
        className={`p-6 rounded-2xl text-white shadow-elevation-mid space-y-2 print:text-text print:bg-none print:border print:border-border ${
          hasOutstandingBalance
            ? 'bg-gradient-to-br from-brand-strong to-brand'
            : 'bg-gradient-to-br from-emerald-800 to-emerald-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 id="folio-balance-heading" className="text-[11px] uppercase tracking-wider font-bold opacity-90">
            Outstanding balance
          </h2>
          <Receipt className="w-5 h-5 opacity-80" aria-hidden="true" />
        </div>
        <p data-testid="folio-outstanding-balance" className="text-3xl font-extrabold tracking-tight">
          {formattedOutstanding}
        </p>
        <p className="text-xs flex items-center gap-1.5 leading-snug opacity-90">
          {hasOutstandingBalance ? (
            <span>Payable at the front desk before check-out.</span>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Your folio is fully settled. Nothing is due at check-out.</span>
            </>
          )}
        </p>
      </section>

      <dl aria-label="Folio totals" className="grid grid-cols-3 gap-2.5 text-center">
        <BillSummaryTile
          label="Total billed"
          formattedAmount={formatMoney(bill.totalChargedMinor, bill.currency)}
          testIdentifier="folio-total-billed"
        />
        <BillSummaryTile
          label="Total paid"
          formattedAmount={formatMoney(bill.totalPaidMinor, bill.currency)}
          testIdentifier="folio-total-paid"
          amountClassName="text-status-success"
        />
        <BillSummaryTile
          label="Net balance"
          formattedAmount={formattedOutstanding}
          testIdentifier="folio-net-balance"
          amountClassName={hasOutstandingBalance ? 'text-brand' : 'text-status-success'}
        />
      </dl>

      <section aria-labelledby="folio-items-heading" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 id="folio-items-heading" className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Itemized orders
          </h2>
          <span className="text-xs text-text-muted">
            {bill.ordersCount} {bill.ordersCount === 1 ? 'order' : 'orders'}
          </span>
        </div>

        {!bill.areLineItemsAvailable ? (
          <div
            role="status"
            className="bg-surface rounded-xl p-4 border border-border text-xs text-text-muted flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-status-warning" aria-hidden="true" />
            <span>Itemized orders are temporarily unavailable. The totals above are up to date.</span>
          </div>
        ) : bill.lineItems.length === 0 ? (
          <div className="bg-surface rounded-xl p-5 border border-border text-center text-xs text-text-muted">
            No charges recorded for this stay yet.
          </div>
        ) : (
          <ul
            aria-label="Itemized folio charges"
            className="divide-y divide-border bg-surface border border-border rounded-xl overflow-hidden shadow-elevation-low"
          >
            {bill.lineItems.map((lineItem) => (
              <BillLineItemRow key={lineItem.identifier} lineItem={lineItem} currency={bill.currency} />
            ))}
          </ul>
        )}
      </section>

      <div className="pt-2 print:hidden">
        <Button
          type="button"
          variant="outline"
          onClick={onPrintRequest}
          className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold"
        >
          <Printer className="w-4 h-4" aria-hidden="true" />
          <span>Print / Download PDF</span>
        </Button>
        <p className="text-[11px] text-text-muted text-center mt-2">
          Choose &ldquo;Save as PDF&rdquo; in the print dialog to download a copy.
        </p>
      </div>
    </div>
  );
};

/**
 * Digital room folio bill: authoritative backend totals (billed, paid, net balance),
 * itemized stay orders with their settlement state, and a print / PDF trigger.
 */
export const DigitalBillPage: React.FC = () => {
  const { bill, hasActiveSession, isLoading, isError, refetchBill } = useStayBill();

  const handlePrintRequest = useCallback(() => {
    window.print();
  }, []);

  if (!hasActiveSession) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
        <h1 className="text-lg font-bold text-text mb-1">No Active Stay</h1>
        <p className="text-xs text-text-muted leading-relaxed">
          Scan the QR code in your room to view your folio bill.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading folio bill"
        className="p-4 space-y-4 max-w-lg mx-auto w-full motion-safe:animate-pulse"
      >
        <div className="h-6 w-40 bg-surface-muted rounded-md" />
        <div className="h-36 bg-surface rounded-2xl border border-border" />
        <div className="h-28 bg-surface rounded-2xl border border-border" />
      </div>
    );
  }

  if (isError || !bill) {
    return (
      <div
        role="alert"
        className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto"
      >
        <div className="w-14 h-14 rounded-full bg-status-danger/10 text-status-danger flex items-center justify-center mb-3">
          <XCircle className="w-7 h-7" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-bold text-text mb-1">Could Not Load Folio Bill</h1>
        <p className="text-xs text-text-muted leading-relaxed mb-5">
          We could not retrieve your stay statement. Please try again.
        </p>
        <Button type="button" variant="primary" onClick={() => void refetchBill()} className="flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          <span>Retry</span>
        </Button>
      </div>
    );
  }

  return <DigitalBillContent bill={bill} onPrintRequest={handlePrintRequest} />;
};
