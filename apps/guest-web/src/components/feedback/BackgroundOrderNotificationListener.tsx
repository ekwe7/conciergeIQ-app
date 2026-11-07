import React, { useRef } from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { OrderStatus } from '@conciergeiq/contracts';
import { ToastVariant, useToast } from './ToastContext';
import { useGuestWebSocket } from '../../features/guest-session/hooks/useGuestWebSocket';
import { retrieveGuestSession } from '../../features/guest-session/session-store';
import { STAY_BILL_QUERY_KEY_PREFIX } from '../../features/billing/hooks/useStayBill';
import { OrderStatusUpdatedPayload } from '../../lib/websocket-client';

export const ORDER_TRACKING_ROUTE_PATTERN: string = '/orders/:orderId';

const KNOWN_ORDER_STATUSES: readonly OrderStatus[] = ['PENDING', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED'];

function isKnownOrderStatus(candidateStatus: string): candidateStatus is OrderStatus {
  return (KNOWN_ORDER_STATUSES as readonly string[]).includes(candidateStatus);
}

interface OrderStatusToastContent {
  title: string;
  message: string;
  variant: ToastVariant;
}

export function createOrderStatusToastContent(
  orderStatus: OrderStatus,
  orderIdentifier: string
): OrderStatusToastContent {
  const shortReference: string =
    orderIdentifier.length > 10 ? orderIdentifier.slice(-6).toUpperCase() : orderIdentifier;

  switch (orderStatus) {
    case 'IN_PROGRESS':
      return {
        title: 'Order in the kitchen',
        message: `Order #${shortReference} is being prepared.`,
        variant: 'info',
      };
    case 'DELIVERED':
      return {
        title: 'Order delivered',
        message: `Order #${shortReference} has arrived at your room. Enjoy!`,
        variant: 'success',
      };
    case 'CANCELLED':
      return {
        title: 'Order cancelled',
        message: `Order #${shortReference} was cancelled by staff. Tap to see details.`,
        variant: 'danger',
      };
    case 'PENDING':
    default:
      return {
        title: 'Order received',
        message: `Order #${shortReference} was sent to staff.`,
        variant: 'info',
      };
  }
}

/**
 * Listens for real-time order status events and shows a toast while the guest is on any
 * screen other than order tracking.
 *
 * On the tracking screen this listener disconnects: that screen opens its own socket and
 * renders live status itself, so keeping both would duplicate connections and alerts.
 */
export const BackgroundOrderNotificationListener: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const currentSession = retrieveGuestSession();

  const isOnTrackingScreen: boolean =
    matchPath(ORDER_TRACKING_ROUTE_PATTERN, location.pathname) !== null;

  // Reconnect replays can redeliver events; remember which ones were already shown.
  const announcedEventKeysReference = useRef<Set<string>>(new Set());

  const handleOrderStatusUpdated = (orderUpdatePayload: OrderStatusUpdatedPayload) => {
    const { orderId: orderIdentifier, newStatus, stayId: eventStayIdentifier } = orderUpdatePayload;

    if (!orderIdentifier || !isKnownOrderStatus(newStatus)) {
      return;
    }
    if (eventStayIdentifier && currentSession && eventStayIdentifier !== currentSession.stayId) {
      return;
    }

    // Payment state and totals can change with order status; keep the folio fresh.
    void queryClient.invalidateQueries({ queryKey: [...STAY_BILL_QUERY_KEY_PREFIX] });

    const eventDeduplicationKey: string = orderUpdatePayload.eventId ?? `${orderIdentifier}:${newStatus}`;
    if (announcedEventKeysReference.current.has(eventDeduplicationKey)) {
      return;
    }
    announcedEventKeysReference.current.add(eventDeduplicationKey);

    const toastContent = createOrderStatusToastContent(newStatus, orderIdentifier);
    showToast({
      ...toastContent,
      orderIdentifier,
      action: {
        label: 'Track order',
        onClick: () => navigate(`/orders/${encodeURIComponent(orderIdentifier)}`),
      },
    });
  };

  useGuestWebSocket({
    sessionToken: currentSession?.sessionToken,
    stayId: currentSession?.stayId,
    enabled: !isOnTrackingScreen,
    onOrderStatusUpdated: handleOrderStatusUpdated,
  });

  return null;
};
