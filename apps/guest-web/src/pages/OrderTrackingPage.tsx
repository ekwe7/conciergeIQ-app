import React, { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Badge } from '@conciergeiq/ui';
import { Order, OrderStatus } from '@conciergeiq/contracts';
import { formatTimeOnly } from '@conciergeiq/utils';
import {
  Clock,
  ChefHat,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  PhoneCall,
  UtensilsCrossed,
  Radio,
  RefreshCw,
} from 'lucide-react';
import {
  useTrackOrder,
  OrderProgressStepper,
  OrderCancellationBanner,
  OrderItemsReceipt,
} from '../features/orders';

export interface OrderTrackingPageProperties {
  order?: Order | null;
  onBackToMenu?: () => void;
  orderIdOverride?: string;
}

const FALLBACK_DEFAULT_ORDER: Order = {
  id: 'ord_demo_1042',
  roomNumber: '101',
  stayId: 'stay_demo_101',
  hotelId: 'htl_lagos_grand',
  status: 'PENDING',
  items: [
    {
      itemId: 'item_jollof_deluxe',
      name: 'Jollof Rice & Roasted Chicken',
      quantity: 1,
      unitPriceMinor: 2400,
      totalMinor: 2400,
      specialInstructions: 'Extra spicy, plantain on the side',
    },
  ],
  subtotalMinor: 2400,
  taxMinor: 192,
  totalMinor: 2592,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Mobile Live Order Tracking Page (UI: G05) with multi-step animated progress indicators,
 * real-time WebSocket state transitions, cancellation alert banners, and receipt breakdowns.
 */
export const OrderTrackingPage: React.FC<OrderTrackingPageProperties> = ({
  order: externalOrder,
  onBackToMenu,
  orderIdOverride,
}) => {
  const navigate = useNavigate();
  const routeParameters = useParams<{ orderId: string }>();

  const targetOrderId: string | undefined =
    orderIdOverride ?? externalOrder?.id ?? routeParameters.orderId;

  const {
    order: trackedOrder,
    isLoading: isOrderQueryLoading,
    isError: isOrderQueryError,
    refetch: refetchOrderDetails,
    isWebSocketConnected,
    liveStatusAnnouncement,
  } = useTrackOrder(targetOrderId, {
    initialOrder: externalOrder ?? (targetOrderId ? null : FALLBACK_DEFAULT_ORDER),
  });

  const activeOrder: Order | null =
    trackedOrder ?? externalOrder ?? (targetOrderId ? null : FALLBACK_DEFAULT_ORDER);

  const handleBackNavigation = useCallback(() => {
    if (onBackToMenu) {
      onBackToMenu();
    } else {
      navigate('/menu');
    }
  }, [onBackToMenu, navigate]);

  const handleCallFrontDesk = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = 'tel:0';
    }
  }, []);

  // Loading Skeleton View
  if (isOrderQueryLoading && !activeOrder) {
    return (
      <div
        role="status"
        aria-label="Loading order progress"
        className="min-h-full flex flex-col justify-between pb-20 animate-pulse"
      >
        <div className="bg-surface border-b border-border px-4 py-3.5 flex items-center justify-between">
          <div className="w-8 h-8 rounded-full bg-surface-muted" />
          <div className="h-5 w-28 bg-surface-muted rounded" />
          <div className="h-5 w-16 bg-surface-muted rounded-full" />
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto w-full flex-1">
          <div className="h-44 bg-surface rounded-2xl border border-border" />
          <div className="h-52 bg-surface rounded-2xl border border-border" />
          <div className="h-32 bg-surface rounded-2xl border border-border" />
        </div>
      </div>
    );
  }

  // Error / Not Found View
  if ((isOrderQueryError && !activeOrder) || !activeOrder) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-full bg-status-warning/15 text-status-warning flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 opacity-75" />
        </div>
        <h2 className="text-xl font-bold text-text mb-1.5">No Active Order Found</h2>
        <p className="text-xs text-text-muted leading-relaxed mb-6">
          We could not locate this order ticket. It may have expired or belongs to a different room session.
        </p>
        <div className="flex flex-col gap-2.5 w-full">
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate('/menu')}
            className="w-full"
          >
            Browse Food Menu
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => refetchOrderDetails()}
            className="w-full flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </Button>
        </div>
      </div>
    );
  }

  const orderStatus: OrderStatus = activeOrder.status;
  const isOrderCancelled: boolean = orderStatus === 'CANCELLED';

  const cancellationReasonText: string | null =
    (activeOrder as { rejectionReason?: string | null; cancelReason?: string | null })
      .rejectionReason ??
    (activeOrder as { rejectionReason?: string | null; cancelReason?: string | null })
      .cancelReason ??
    null;

  const resolveStatusHeroDetails = () => {
    switch (orderStatus) {
      case 'PENDING':
        return {
          title: 'Order received',
          subtitle: `Sent to staff instantly · ${formatTimeOnly(activeOrder.createdAt)}`,
          badgeVariant: 'warning' as const,
          badgeLabel: 'ORDER RECEIVED',
          iconContainerBg: 'bg-amber-100 text-amber-800',
          HeroIcon: Clock,
        };
      case 'IN_PROGRESS':
        return {
          title: 'Being prepared',
          subtitle: `Accepted by kitchen · ${formatTimeOnly(activeOrder.updatedAt || activeOrder.createdAt)}`,
          badgeVariant: 'info' as const,
          badgeLabel: 'IN PROGRESS',
          iconContainerBg: 'bg-sky-100 text-sky-800',
          HeroIcon: ChefHat,
        };
      case 'DELIVERED':
        return {
          title: 'Delivered to room',
          subtitle: `Arrived at Room ${activeOrder.roomNumber} · ${formatTimeOnly(activeOrder.updatedAt || activeOrder.createdAt)}`,
          badgeVariant: 'success' as const,
          badgeLabel: 'DELIVERED',
          iconContainerBg: 'bg-emerald-100 text-emerald-800',
          HeroIcon: CheckCircle2,
        };
      case 'CANCELLED':
      default:
        return {
          title: 'Order cancelled',
          subtitle: 'This ticket could not be completed by staff',
          badgeVariant: 'danger' as const,
          badgeLabel: 'CANCELLED',
          iconContainerBg: 'bg-rose-100 text-rose-800',
          HeroIcon: XCircle,
        };
    }
  };

  const heroDetails = resolveStatusHeroDetails();
  const HeroStatusIcon = heroDetails.HeroIcon;

  return (
    <div className="min-h-full flex flex-col justify-between pb-24">
      {/* Screen Reader Live Region for polite real-time status transitions */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveStatusAnnouncement || `Current status is ${heroDetails.title}`}
      </div>

      {/* Top App Header */}
      <header className="bg-surface border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-elevation-low">
        <button
          type="button"
          aria-label="Back to In-Room Menu"
          onClick={handleBackNavigation}
          className="p-2 -ml-2 text-text hover:bg-surface-muted rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>

        <h1 className="text-sm font-bold text-text truncate max-w-[200px]">
          Order #{activeOrder.id}
        </h1>

        <Badge variant="neutral" className="font-semibold text-xs py-0.5 px-2.5">
          Room {activeOrder.roomNumber}
        </Badge>
      </header>

      {/* Main Content Area */}
      <main className="p-4 space-y-4 max-w-lg mx-auto w-full flex-1">
        {/* Hero Card matching prototype G05 */}
        <Card className="p-6 text-center bg-gradient-to-b from-surface to-surface-muted/50 border-border shadow-elevation-low space-y-3">
          <div
            className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl shadow-elevation-low transition-transform duration-300 ${heroDetails.iconContainerBg}`}
          >
            <HeroStatusIcon className="w-10 h-10" aria-hidden="true" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-serif font-bold text-text tracking-tight">
              {heroDetails.title}
            </h2>
            <p className="text-xs text-text-muted leading-relaxed font-normal">
              {heroDetails.subtitle}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 pt-1">
            <Badge
              variant={heroDetails.badgeVariant}
              className="text-xs px-3 py-1 font-bold tracking-wide flex items-center gap-1.5 shadow-sm"
            >
              {orderStatus === 'IN_PROGRESS' && (
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping inline-block" />
              )}
              {heroDetails.badgeLabel}
            </Badge>
          </div>
        </Card>

        {/* Cancellation Alert Banner */}
        {isOrderCancelled && (
          <OrderCancellationBanner
            cancellationReason={cancellationReasonText}
            onContactFrontDesk={handleCallFrontDesk}
          />
        )}

        {/* Multi-Step Animated Progress Stepper */}
        {!isOrderCancelled && (
          <OrderProgressStepper
            orderStatus={orderStatus}
            createdAtIsoTimestamp={activeOrder.createdAt}
            updatedAtIsoTimestamp={activeOrder.updatedAt}
          />
        )}

        {/* Order Details Receipt */}
        <OrderItemsReceipt
          orderLineItems={activeOrder.items}
          subtotalMinor={activeOrder.subtotalMinor}
          taxMinor={activeOrder.taxMinor}
          totalMinor={activeOrder.totalMinor}
        />

        {/* Real-time Connection Status Indicator */}
        <div
          aria-live="off"
          className="flex items-center justify-center gap-2 text-xs text-text-muted pt-2 pb-1"
        >
          {isWebSocketConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Live
              </span>
              <span className="text-[11px]">Updates automatically</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-[11px] text-text-muted">
                Connecting · Updates via 30s refresh
              </span>
            </>
          )}
        </div>
      </main>

      {/* Bottom Floating Navigation Actions */}
      <footer className="fixed bottom-0 left-0 right-0 p-3 bg-surface/95 backdrop-blur border-t border-border z-30">
        <div className="max-w-lg mx-auto grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleCallFrontDesk}
            className="flex items-center justify-center gap-2 text-sm font-semibold py-3"
          >
            <PhoneCall className="w-4 h-4 text-text-muted" aria-hidden="true" />
            <span>Call Desk</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleBackNavigation}
            className="flex items-center justify-center gap-2 text-sm font-bold py-3 shadow-elevation-low"
          >
            <UtensilsCrossed className="w-4 h-4" aria-hidden="true" />
            <span>Order More</span>
          </Button>
        </div>
      </footer>
    </div>
  );
};
