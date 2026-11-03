import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Badge } from '@conciergeiq/ui';
import { formatMoney, formatDate } from '@conciergeiq/utils';
import { Order, OrderStatus } from '@conciergeiq/contracts';
import { Clock, ChefHat, CheckCircle2, ArrowLeft } from 'lucide-react';

export interface OrderTrackingPageProperties {
  order?: Order | null;
  onBackToMenu?: () => void;
}

interface TrackingStep {
  statusKey: OrderStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const TRACKING_STEPS: TrackingStep[] = [
  { statusKey: 'PENDING', label: 'Order Received', icon: Clock, description: 'Kitchen acknowledged ticket' },
  { statusKey: 'IN_PROGRESS', label: 'In the Kitchen', icon: ChefHat, description: 'Chef preparing your dishes' },
  { statusKey: 'DELIVERED', label: 'Delivered', icon: CheckCircle2, description: 'Delivered to room door' },
];

const DEFAULT_SAMPLE_ORDER: Order = {
  id: 'ord_KITCHEN_9921',
  roomNumber: '402',
  stayId: 'stay_demo_9921',
  hotelId: 'htl_lagos_grand',
  status: 'IN_PROGRESS',
  items: [
    {
      itemId: 'item_2',
      name: 'Truffle Wagyu Burger & Crisp Fries',
      quantity: 1,
      unitPriceMinor: 2400,
      totalMinor: 2400,
    },
  ],
  subtotalMinor: 2400,
  taxMinor: 192,
  totalMinor: 2592,
  createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  updatedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
};

export const OrderTrackingPage: React.FC<OrderTrackingPageProperties> = ({
  order: externalOrder,
  onBackToMenu,
}) => {
  const navigate = useNavigate();
  const routeParameters = useParams<{ orderId: string }>();

  const activeOrder: Order | null =
    externalOrder !== undefined
      ? externalOrder
      : routeParameters.orderId
      ? { ...DEFAULT_SAMPLE_ORDER, id: routeParameters.orderId }
      : DEFAULT_SAMPLE_ORDER;

  const handleBackNavigation = () => {
    if (onBackToMenu) {
      onBackToMenu();
    } else {
      navigate('/menu');
    }
  };

  if (!activeOrder) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Clock className="w-12 h-12 text-text-muted mb-4 opacity-40" />
        <h2 className="text-lg font-bold text-text mb-1">No Active Order</h2>
        <p className="text-xs text-text-muted max-w-xs mb-6">
          You don't have any orders currently processing. Order your favorite meal now!
        </p>
        <Button variant="primary" onClick={handleBackNavigation}>
          Browse Menu
        </Button>
      </div>
    );
  }

  const currentStepIndex =
    activeOrder.status === 'CANCELLED'
      ? -1
      : TRACKING_STEPS.findIndex((stepItem) => stepItem.statusKey === activeOrder.status);

  const resolveBadgeVariant = (orderStatus: OrderStatus): 'neutral' | 'info' | 'warning' | 'success' | 'danger' => {
    switch (orderStatus) {
      case 'DELIVERED':
        return 'success';
      case 'CANCELLED':
        return 'danger';
      case 'IN_PROGRESS':
        return 'info';
      case 'PENDING':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="min-h-full flex flex-col justify-between pb-20">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Back to Menu"
          onClick={handleBackNavigation}
          className="p-2 -ml-2 text-text hover:bg-surface-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-text">Order #{activeOrder.id}</h1>
        <div className="w-5" />
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto w-full flex-1">
        {/* Status Stepper Banner */}
        <Card className="p-5 text-center bg-surface shadow-elevation-low">
          <Badge
            variant={resolveBadgeVariant(activeOrder.status)}
            className="mb-2"
          >
            Status: {activeOrder.status.replace('_', ' ')}
          </Badge>

          <h2 className="text-xl font-bold text-text">
            {activeOrder.status === 'PENDING' && 'Order Transmitted to Kitchen'}
            {activeOrder.status === 'IN_PROGRESS' && 'Dish is Sizzling in Kitchen'}
            {activeOrder.status === 'DELIVERED' && 'Delivered to Room'}
            {activeOrder.status === 'CANCELLED' && 'Order Cancelled'}
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Room {activeOrder.roomNumber} &bull; Ordered at {formatDate(activeOrder.createdAt)}
          </p>

          {/* Stepper Visualization */}
          <div className="mt-6 flex items-center justify-between relative px-4">
            <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-0.5 bg-border -z-0" />
            {TRACKING_STEPS.map((stepItem, stepIndex) => {
              const isPastOrCurrent = currentStepIndex >= stepIndex;
              const StepIconComponent = stepItem.icon;
              return (
                <div key={stepItem.statusKey} className="flex flex-col items-center relative z-10">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      isPastOrCurrent
                        ? 'bg-brand text-white shadow-elevation-low'
                        : 'bg-surface border-2 border-border text-text-muted'
                    }`}
                  >
                    <StepIconComponent className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-semibold mt-2 text-text">
                    {stepItem.label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Order Details List */}
        <Card className="p-4 divide-y divide-border shadow-elevation-low">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted pb-2">Order Items</h3>
          {activeOrder.items.map((orderItem) => (
            <div key={orderItem.itemId} className="py-2.5 flex justify-between items-center text-xs">
              <span className="text-text">
                <strong className="text-brand mr-1.5">{orderItem.quantity}x</strong>
                {orderItem.name}
              </span>
              <span className="font-semibold text-text">{formatMoney(orderItem.totalMinor, 'USD')}</span>
            </div>
          ))}
          <div className="pt-3 flex justify-between items-center text-sm font-bold text-text">
            <span>Total Billed</span>
            <span className="text-brand">{formatMoney(activeOrder.totalMinor, 'USD')}</span>
          </div>
        </Card>

        <div className="pt-2">
          <Button variant="outline" className="w-full" onClick={handleBackNavigation}>
            Back to In-Room Menu
          </Button>
        </div>
      </div>
    </div>
  );
};
