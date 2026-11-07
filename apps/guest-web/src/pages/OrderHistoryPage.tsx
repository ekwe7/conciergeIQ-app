import React from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button } from '@conciergeiq/ui';
import { formatMoney, formatDate } from '@conciergeiq/utils';
import {
  Clock,
  ChefHat,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ShoppingBag,
  RefreshCw,
  Receipt,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { Order, OrderStatus } from '@conciergeiq/contracts';
import { useGuestOrderHistory } from '../features/orders/hooks/useGuestOrderHistory';
import { retrieveGuestSession } from '../features/guest-session/session-store';
import {
  formatPaymentStatusLabel,
  resolveOrderPaymentStatus,
} from '../features/billing/payment-status';
import { GUEST_DISPLAY_CURRENCY_CODE, PaymentSettlementStatus } from '../features/billing/types';

type StatusBadgeVariant = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

interface OrderStatusPresentation {
  label: string;
  badgeVariant: StatusBadgeVariant;
  IconComponent: LucideIcon;
}

function resolveOrderStatusPresentation(orderStatus: OrderStatus): OrderStatusPresentation {
  switch (orderStatus) {
    case 'IN_PROGRESS':
      return { label: 'In the kitchen', badgeVariant: 'info', IconComponent: ChefHat };
    case 'DELIVERED':
      return { label: 'Delivered', badgeVariant: 'success', IconComponent: CheckCircle2 };
    case 'CANCELLED':
      return { label: 'Cancelled', badgeVariant: 'danger', IconComponent: XCircle };
    case 'PENDING':
    default:
      return { label: 'Order received', badgeVariant: 'warning', IconComponent: Clock };
  }
}

function resolvePaymentChipClasses(paymentStatus: PaymentSettlementStatus): string {
  switch (paymentStatus) {
    case 'PAID':
      return 'bg-emerald-50 text-status-success border-emerald-200';
    case 'NOT_CHARGED':
      return 'bg-surface-muted text-text-muted border-border';
    case 'CHARGED_TO_ROOM_FOLIO':
    default:
      return 'bg-brand-50 text-brand border-border';
  }
}

function formatShortOrderReference(orderIdentifier: string): string {
  return orderIdentifier.length > 10 ? orderIdentifier.slice(-6).toUpperCase() : orderIdentifier;
}

const OrderHistoryCard: React.FC<{ orderRecord: Order }> = ({ orderRecord }) => {
  const { label: statusLabel, badgeVariant, IconComponent } = resolveOrderStatusPresentation(
    orderRecord.status
  );
  const paymentStatus = resolveOrderPaymentStatus(orderRecord);
  const formattedTotal = formatMoney(orderRecord.totalMinor, GUEST_DISPLAY_CURRENCY_CODE);
  const shortReference = formatShortOrderReference(orderRecord.id);
  const itemsSummaryDescription = orderRecord.items
    .map((itemRecord) => `${itemRecord.quantity}× ${itemRecord.name}`)
    .join(', ');

  return (
    <Link
      to={`/orders/${encodeURIComponent(orderRecord.id)}`}
      aria-label={`Order ${shortReference}, ${statusLabel}, ${formatPaymentStatusLabel(paymentStatus)}, total ${formattedTotal}`}
      data-testid={`order-history-card-${orderRecord.id}`}
      className="block p-4 bg-surface border border-border rounded-2xl shadow-elevation-low space-y-3 transition-colors hover:border-brand/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-xs text-text truncate">Order #{shortReference}</span>
          <time dateTime={orderRecord.createdAt} className="text-[11px] text-text-muted shrink-0">
            {formatDate(orderRecord.createdAt)}
          </time>
        </div>
        <Badge variant={badgeVariant} className="flex items-center gap-1 shrink-0 text-[10px] font-bold">
          <IconComponent className="w-3 h-3" aria-hidden="true" />
          <span>{statusLabel}</span>
        </Badge>
      </div>

      <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">{itemsSummaryDescription}</p>

      <div className="flex items-center justify-between pt-2 border-t border-border/70 text-xs">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ${resolvePaymentChipClasses(paymentStatus)}`}
        >
          {formatPaymentStatusLabel(paymentStatus)}
        </span>
        <span className="flex items-center gap-1.5 font-bold text-text">
          <span>{formattedTotal}</span>
          <ChevronRight className="w-4 h-4 text-text-muted" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
};

/**
 * Lists every room service order placed during the active stay, newest first,
 * with each order's live status and folio settlement state.
 */
export const OrderHistoryPage: React.FC = () => {
  const currentSession = retrieveGuestSession();
  const { ordersList, hasActiveSession, isLoading, isError, refetchOrders } = useGuestOrderHistory();

  if (!hasActiveSession) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
        <h1 className="text-lg font-bold text-text mb-1">No Active Stay</h1>
        <p className="text-xs text-text-muted leading-relaxed">
          Scan the QR code in your room to view the orders for your stay.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading order history"
        className="p-4 space-y-4 max-w-lg mx-auto w-full motion-safe:animate-pulse"
      >
        <div className="h-6 w-36 bg-surface-muted rounded-md" />
        <div className="h-28 bg-surface rounded-2xl border border-border" />
        <div className="h-28 bg-surface rounded-2xl border border-border" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto"
      >
        <div className="w-14 h-14 rounded-full bg-status-danger/10 text-status-danger flex items-center justify-center mb-3">
          <XCircle className="w-7 h-7" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-bold text-text mb-1">Could Not Load Orders</h1>
        <p className="text-xs text-text-muted leading-relaxed mb-5">
          We could not retrieve the orders for your stay. Please try again.
        </p>
        <Button type="button" variant="primary" onClick={() => void refetchOrders()} className="flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          <span>Retry</span>
        </Button>
      </div>
    );
  }

  const ordersCountLabel = `${ordersList.length} ${ordersList.length === 1 ? 'order' : 'orders'}`;

  return (
    <div className="p-4 max-w-lg mx-auto w-full space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text tracking-tight">Order History</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {currentSession?.roomNumber ? `Room ${currentSession.roomNumber} • ` : ''}This stay
          </p>
        </div>
        <Badge variant="neutral" className="text-xs font-semibold">
          {ordersCountLabel}
        </Badge>
      </div>

      {ordersList.length === 0 ? (
        <div className="p-8 text-center bg-surface border border-border rounded-2xl shadow-elevation-low space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-surface-muted text-text-muted flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 opacity-60" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-text">No Orders Placed Yet</h2>
            <p className="text-xs text-text-muted max-w-xs mx-auto leading-relaxed">
              You haven&apos;t placed any dining orders during this stay.
            </p>
          </div>
          <Link
            to="/menu"
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-brand text-white px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <UtensilsCrossed className="w-4 h-4" aria-hidden="true" />
            <span>Browse In-Room Dining Menu</span>
          </Link>
        </div>
      ) : (
        <>
          <ol aria-label="Orders placed during this stay" className="space-y-3">
            {ordersList.map((orderRecord) => (
              <li key={orderRecord.id}>
                <OrderHistoryCard orderRecord={orderRecord} />
              </li>
            ))}
          </ol>
          <Link
            to="/bill"
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-surface py-3 text-xs font-bold text-text hover:border-brand/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Receipt className="w-4 h-4" aria-hidden="true" />
            <span>View folio bill &amp; balance</span>
          </Link>
        </>
      )}
    </div>
  );
};
