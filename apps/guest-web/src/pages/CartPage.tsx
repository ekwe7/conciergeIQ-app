import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@conciergeiq/ui';
import { formatMoney } from '@conciergeiq/utils';
import { CartItem, GuestSession, Order } from '@conciergeiq/contracts';
import { ArrowLeft, Trash2, ShieldCheck, CheckCircle2 } from 'lucide-react';

export interface CartPageProperties {
  onBack?: () => void;
  cart?: CartItem[];
  session?: GuestSession;
  onClearCart?: () => void;
  onOrderSuccess?: (placedOrder: Order) => void;
}

const DEFAULT_GUEST_SESSION: GuestSession = {
  token: 'qr_demo_token_8829',
  roomNumber: '402',
  stayId: 'stay_demo_9921',
  hotelId: 'htl_lagos_grand',
  hotelName: 'The Lagos Grand Hotel & Suites',
  guestName: 'Adeola Johnson',
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};

export const CartPage: React.FC<CartPageProperties> = ({
  onBack,
  cart = [],
  session = DEFAULT_GUEST_SESSION,
  onClearCart,
  onOrderSuccess,
}) => {
  const navigate = useNavigate();
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');

  const subtotalMinor = cart.reduce(
    (runningTotal, cartEntry) =>
      runningTotal + cartEntry.item.priceMinor * cartEntry.quantity,
    0
  );
  const taxMinor = Math.round(subtotalMinor * 0.08); // 8% room service tax
  const totalMinor = subtotalMinor + taxMinor;

  const handleBackNavigation = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/menu');
    }
  };

  const handleClearCartAction = () => {
    if (onClearCart) {
      onClearCart();
    }
  };

  const handlePlaceOrder = () => {
    setIsSubmittingOrder(true);
    setTimeout(() => {
      const newOrder: Order = {
        id: `ord_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        roomNumber: session.roomNumber,
        stayId: session.stayId,
        hotelId: session.hotelId,
        status: 'PENDING',
        items: cart.map((cartEntry) => ({
          itemId: cartEntry.item.id,
          name: cartEntry.item.name,
          quantity: cartEntry.quantity,
          unitPriceMinor: cartEntry.item.priceMinor,
          totalMinor: cartEntry.item.priceMinor * cartEntry.quantity,
          specialInstructions,
        })),
        subtotalMinor,
        taxMinor,
        totalMinor,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setIsSubmittingOrder(false);
      if (onClearCart) {
        onClearCart();
      }
      if (onOrderSuccess) {
        onOrderSuccess(newOrder);
      } else {
        navigate(`/orders/${newOrder.id}`);
      }
    }, 600);
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-surface-muted rounded-full flex items-center justify-center text-text-muted mb-4 border border-border">
          <Trash2 className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-text mb-1">Your cart is empty</h2>
        <p className="text-xs text-text-muted max-w-xs mb-6">
          Explore our menu and add fine food or drinks to satisfy your appetite.
        </p>
        <Button variant="primary" onClick={handleBackNavigation}>
          Return to Menu
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col justify-between pb-32">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Back"
          onClick={handleBackNavigation}
          className="p-2 -ml-2 text-text hover:bg-surface-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-text">Your Cart</h1>
        <button
          type="button"
          onClick={handleClearCartAction}
          className="text-xs text-status-danger font-medium hover:underline"
        >
          Clear
        </button>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto w-full flex-1">
        {/* Delivery Details */}
        <Card className="p-4 bg-brand-50/50 border-brand/20 shadow-elevation-low">
          <div className="flex items-center space-x-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-brand" />
            <span className="text-xs font-semibold text-brand-strong">Delivering to Room {session.roomNumber}</span>
          </div>
          <p className="text-xs text-text-muted">
            Guest: {session.guestName || 'Valued Guest'} &bull; Folio Direct Billing
          </p>
        </Card>

        {/* Order Items */}
        <Card className="p-4 divide-y divide-border shadow-elevation-low">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted pb-3">Selected Items</h2>
          {cart.map((cartEntry) => (
            <div key={cartEntry.item.id} className="py-3 flex justify-between items-start first:pt-3">
              <div>
                <p className="text-sm font-semibold text-text">
                  <span className="text-brand font-bold mr-1.5">{cartEntry.quantity}x</span>
                  {cartEntry.item.name}
                </p>
                <p className="text-xs text-text-muted">
                  {formatMoney(cartEntry.item.priceMinor, 'USD')} each
                </p>
              </div>
              <span className="text-sm font-bold text-text">
                {formatMoney(cartEntry.item.priceMinor * cartEntry.quantity, 'USD')}
              </span>
            </div>
          ))}
        </Card>

        {/* Special Instructions */}
        <Card className="p-4 space-y-2 shadow-elevation-low">
          <label htmlFor="cartSpecialInstructions" className="text-xs font-bold uppercase tracking-wider text-text-muted block">
            Special Requests & Dietary Instructions
          </label>
          <textarea
            id="cartSpecialInstructions"
            rows={2}
            value={specialInstructions}
            onChange={(changeEvent) => setSpecialInstructions(changeEvent.target.value)}
            placeholder="e.g. dressing on the side, extra ice, no cutlery required..."
            className="w-full text-xs p-3 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </Card>

        {/* Price Breakdown */}
        <Card className="p-4 space-y-2 text-xs shadow-elevation-low">
          <div className="flex justify-between text-text-muted">
            <span>Subtotal</span>
            <span className="font-medium text-text">{formatMoney(subtotalMinor, 'USD')}</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>Room Service Tax (8%)</span>
            <span className="font-medium text-text">{formatMoney(taxMinor, 'USD')}</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>Delivery Fee</span>
            <span className="font-medium text-brand">Complimentary</span>
          </div>
          <div className="pt-2 border-t border-border flex justify-between items-center text-sm font-bold text-text">
            <span>Total Billed to Room</span>
            <span className="text-base text-brand">{formatMoney(totalMinor, 'USD')}</span>
          </div>
        </Card>

        <div className="flex items-center space-x-2 text-xs text-text-muted justify-center">
          <ShieldCheck className="w-4 h-4 text-brand" />
          <span>Charge directly settled to room folio upon checkout</span>
        </div>
      </div>

      {/* Persistent Order Button */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-surface/95 backdrop-blur-md border-t border-border shadow-elevation-high max-w-md mx-auto z-20">
        <Button
          variant="primary"
          onClick={handlePlaceOrder}
          disabled={isSubmittingOrder}
          className="w-full py-3 text-base shadow-elevation-mid"
        >
          {isSubmittingOrder ? 'Submitting to Kitchen...' : `Confirm & Place Order (${formatMoney(totalMinor, 'USD')})`}
        </Button>
      </div>
    </div>
  );
};
