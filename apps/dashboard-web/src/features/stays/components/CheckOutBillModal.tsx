import { useEffect } from 'react';
import { AlertCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Overlay } from '../../../components/ui/Overlay';
import { ErrorState, LoadingRows } from '../../../components/ui/Page';
import { useToast } from '../../../components/ui/Toast';
import type { Stay } from '../../../lib/api-types';
import { describeError } from '../../../lib/error-handler';
import { formatAmount, formatDay, formatOrderNumber } from '../../../lib/format';
import { useCheckOut, useStayBill } from '../api';

export interface CheckOutBillModalProperties {
  isOpen: boolean;
  onClose: () => void;
  stay: Stay | null;
  currency?: string;
  timeZone?: string;
  onCheckOutSuccess?: (checkedOutStay: Stay) => void;
}

export function CheckOutBillModal({
  isOpen,
  onClose,
  stay,
  currency = 'NGN',
  timeZone,
  onCheckOutSuccess,
}: CheckOutBillModalProperties) {
  const stayBillQuery = useStayBill(stay?.id ?? null);
  const checkOutMutation = useCheckOut();
  const toastNotification = useToast();

  useEffect(() => {
    if (stay) {
      checkOutMutation.reset();
    }
  }, [stay?.id]);

  if (!isOpen || !stay) {
    return null;
  }

  const stayBillData = stayBillQuery.data;
  const hasOutstandingBalance =
    Boolean(stayBillData) && (stayBillData?.outstanding ?? 0) > 0;
  const hasOpenOrders =
    Boolean(stayBillData) && (stayBillData?.openOrders?.length ?? 0) > 0;
  const hasLooseEnds = hasOutstandingBalance || hasOpenOrders;

  function handleConfirmCheckOut() {
    if (!stay) {
      return;
    }

    checkOutMutation.mutate(stay.id, {
      onSuccess: (confirmedStay: Stay) => {
        toastNotification.show(
          `${confirmedStay.guestName} checked out of Room ${confirmedStay.roomNumber}`,
        );
        onCheckOutSuccess?.(confirmedStay);
        onClose();
      },
    });
  }

  const arrivalFormattedDate = formatDay(stay.checkedInAt, timeZone);

  return (
    <Overlay
      open={isOpen}
      onClose={onClose}
      width="md"
      title={`Check out · Room ${stay.roomNumber}`}
      description={`${stay.guestName} · arrived ${arrivalFormattedDate}`}
      footer={
        <>
          <Button type="button" onClick={onClose}>
            {hasOutstandingBalance
              ? `Collect ${formatAmount(stayBillData?.outstanding ?? 0, currency)} first`
              : 'Cancel'}
          </Button>
          <Button
            variant={hasLooseEnds ? 'danger' : 'primary'}
            onClick={handleConfirmCheckOut}
            pending={checkOutMutation.isPending}
            disabled={!stayBillData}
          >
            {hasLooseEnds ? 'Check out anyway' : 'Confirm check out'}
          </Button>
        </>
      }
    >
      {stayBillQuery.isPending && (
        <LoadingRows rows={4} label="Loading consolidated folio bill" />
      )}

      {stayBillQuery.error && (
        <ErrorState
          message={describeError(stayBillQuery.error)}
          onRetry={() => void stayBillQuery.refetch()}
        />
      )}

      {stayBillData && (
        <div className="space-y-4">
          {/* Open Orders Warning Banner */}
          {hasOpenOrders && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={2} />
              <div className="text-xs space-y-1">
                <p className="font-semibold">
                  {stayBillData.openOrders.length}{' '}
                  {stayBillData.openOrders.length === 1 ? 'order' : 'orders'} still open
                </p>
                <ul className="space-y-0.5">
                  {stayBillData.openOrders.map((openOrderItem) => (
                    <li key={openOrderItem.orderId} className="flex items-center gap-1.5">
                      <span className="tabular font-medium">
                        {formatOrderNumber(openOrderItem.orderNumber)}
                      </span>
                      <span>·</span>
                      <span>{openOrderItem.itemsSummary}</span>
                      <span>·</span>
                      <span className="font-semibold">{openOrderItem.status}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-rose-500/90 dark:text-rose-300">
                  Resolve before completing checkout or proceed to checkout anyway.
                </p>
              </div>
            </div>
          )}

          {/* Consolidated Room Folio Bill Summary Card */}
          <div className="rounded-lg border border-line bg-surface overflow-hidden">
            <div className="flex items-baseline justify-between border-b border-line px-4 py-3 text-[13px]">
              <span className="text-ink-2">Orders this stay</span>
              <span className="tabular font-medium text-ink">
                {stayBillData.ordersCount}
              </span>
            </div>
            <div className="flex items-baseline justify-between border-b border-line px-4 py-3 text-[13px]">
              <span className="text-ink-2">Total charged</span>
              <span className="tabular font-semibold text-ink">
                {formatAmount(stayBillData.totalCharged, currency)}
              </span>
            </div>
            <div className="flex items-baseline justify-between border-b border-line px-4 py-3 text-[13px]">
              <span className="text-ink-2">Paid</span>
              <span className="tabular font-semibold text-emerald-600 dark:text-emerald-400">
                {formatAmount(stayBillData.totalPaid, currency)}
              </span>
            </div>
            <div className="flex items-baseline justify-between px-4 py-3 text-[13px]">
              <span className="text-ink font-medium">Outstanding</span>
              <span
                className={`tabular font-bold ${
                  stayBillData.outstanding > 0
                    ? 'text-rose-600 dark:text-rose-400 text-sm'
                    : 'text-ink'
                }`}
              >
                {formatAmount(stayBillData.outstanding, currency)}
              </span>
            </div>
          </div>

          {/* Prominent Uncollected Balance Warning */}
          {hasOutstandingBalance && (
            <div
              role="alert"
              aria-label="Uncollected balance warning"
              className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-700 dark:text-amber-300"
            >
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-[13px]">
                  Uncollected Balance Warning: {formatAmount(stayBillData.outstanding, currency)} unpaid
                </p>
                <p className="leading-relaxed">
                  Collect the outstanding dining charges from the guest before confirming
                  check-out, then record the transaction on the Payments page.
                </p>
              </div>
            </div>
          )}

          {/* Security Boundary & Session Revocation Notice */}
          <div className="flex items-start gap-2.5 rounded-lg border border-sky-500/20 bg-sky-500/10 p-3 text-sky-700 dark:text-sky-300">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={2} />
            <span className="text-xs leading-relaxed">
              All guest sessions for Room {stay.roomNumber} end immediately upon check-out.
              A photographed or saved QR code will not work after this.
            </span>
          </div>

          {checkOutMutation.error && (
            <p className="text-xs font-medium text-rose-500">
              {describeError(checkOutMutation.error)}
            </p>
          )}
        </div>
      )}
    </Overlay>
  );
}
