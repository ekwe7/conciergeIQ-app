import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge } from '@conciergeiq/ui';
import { formatMoney, formatDate } from '@conciergeiq/utils';
import { Clock, ChefHat, CheckCircle2, ChevronRight, ShoppingBag } from 'lucide-react';
import { Order, OrderStatus } from '@conciergeiq/contracts';

export interface OrdersHistoryPageProperties {
  orders?: Order[];
}

const SAMPLE_ORDERS_HISTORY: Order[] = [
  {
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
  },
  {
    id: 'ord_BREAKFAST_8810',
    roomNumber: '402',
    stayId: 'stay_demo_9921',
    hotelId: 'htl_lagos_grand',
    status: 'DELIVERED',
    items: [
      {
        itemId: 'item_1',
        name: 'Artisan Avocado & Poached Egg Toast',
        quantity: 2,
        unitPriceMinor: 1600,
        totalMinor: 3200,
      },
      {
        itemId: 'item_4',
        name: 'Freshly Brewed Espresso & Croissant',
        quantity: 1,
        unitPriceMinor: 950,
        totalMinor: 950,
      },
    ],
    subtotalMinor: 4150,
    taxMinor: 332,
    totalMinor: 4482,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
];

function resolveStatusBadgeVariant(status: OrderStatus): 'neutral' | 'info' | 'warning' | 'success' | 'danger' {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'IN_PROGRESS':
      return 'info';
    case 'DELIVERED':
      return 'success';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'neutral';
  }
}

function resolveStatusIcon(status: OrderStatus) {
  switch (status) {
    case 'PENDING':
      return Clock;
    case 'IN_PROGRESS':
      return ChefHat;
    case 'DELIVERED':
      return CheckCircle2;
    default:
      return Clock;
  }
}

/**
 * Guest order history page displaying active and past room service orders.
 */
export const OrdersHistoryPage: React.FC<OrdersHistoryPageProperties> = ({
  orders = SAMPLE_ORDERS_HISTORY,
}) => {
  const navigate = useNavigate();

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text">Order History</h2>
          <p className="text-xs text-text-muted">Room 402 service tickets</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/menu')}
        >
          New Order
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="py-16 text-center">
          <ShoppingBag className="w-12 h-12 mx-auto text-text-muted opacity-40 mb-3" />
          <h3 className="text-sm font-semibold text-text">No Orders Placed Yet</h3>
          <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
            Order in-room dining dishes or snacks anytime during your stay.
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-4"
            onClick={() => navigate('/menu')}
          >
            Browse Menu
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const StatusIconComponent = resolveStatusIcon(order.status);
            const statusBadgeVariant = resolveStatusBadgeVariant(order.status);
            const totalItemCount = order.items.reduce(
              (runningTotal, currentItem) => runningTotal + currentItem.quantity,
              0
            );

            return (
              <Card
                key={order.id}
                className="p-4 hover:border-brand/40 transition-all cursor-pointer shadow-elevation-low"
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <StatusIconComponent className="w-4 h-4 text-brand" />
                    <span className="font-semibold text-sm text-text">
                      {order.id}
                    </span>
                  </div>
                  <Badge variant={statusBadgeVariant}>
                    {order.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="text-xs text-text-muted space-y-1 mb-3">
                  <p>
                    {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} &bull;{' '}
                    {order.items.map((item) => item.name).join(', ')}
                  </p>
                  <p>Ordered at {formatDate(order.createdAt)}</p>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                  <span className="font-bold text-text">
                    Total: {formatMoney(order.totalMinor, 'USD')}
                  </span>
                  <span className="text-brand font-medium flex items-center gap-0.5">
                    View Details
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
