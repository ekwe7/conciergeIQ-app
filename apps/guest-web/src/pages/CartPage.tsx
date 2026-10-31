import React, { useState } from 'react';
import { Button, Card } from '@conciergeiq/ui';
import { formatMoney } from '@conciergeiq/utils';
import { CartItem, GuestSession, Order } from '@conciergeiq/contracts';
import { ArrowLeft, Trash2, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface CartPageProps {
  onBack: () => void;
  cart: CartItem[];
  session: GuestSession;
  onClearCart: () => void;
  onOrderSuccess: (order: Order) => void;
}

export const CartPage: React.FC<CartPageProps> = ({
  onBack,
  cart,
  session,
  onClearCart,
  onOrderSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [specialNotes, setSpecialNotes] = useState('');

  const subtotalMinor = cart.reduce((sum, item) => sum + item.item.priceMinor * item.quantity, 0);
  const taxMinor = Math.round(subtotalMinor * 0.08); // 8% tax
  const totalMinor = subtotalMinor + taxMinor;

  const handlePlaceOrder = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const newOrder: Order = {
        id: `ord_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        roomNumber: session.roomNumber,
        stayId: session.stayId,
        hotelId: session.hotelId,
        status: 'PENDING',
        items: cart.map(ci => ({
          itemId: ci.item.id,
          name: ci.item.name,
          quantity: ci.quantity,
          unitPriceMinor: ci.item.priceMinor,
          totalMinor: ci.item.priceMinor * ci.quantity,
          specialInstructions: specialNotes,
        })),
        subtotalMinor,
        taxMinor,
        totalMinor,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setIsSubmitting(false);
      onClearCart();
      onOrderSuccess(newOrder);
    }, 600);
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
          <Trash2 className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Your cart is empty</h2>
        <p className="text-xs text-slate-500 max-w-xs mb-6">
          Explore our menu and add fine food or drinks to satisfy your appetite.
        </p>
        <Button variant="primary" onClick={onBack}>
          Return to Menu
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-slate-700 hover:bg-slate-100 rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-slate-900">Your Cart</h1>
        <button
          onClick={onClearCart}
          className="text-xs text-rose-600 font-medium hover:underline"
        >
          Clear
        </button>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Delivery Details */}
        <Card className="p-4 bg-emerald-50/50 border-emerald-200">
          <div className="flex items-center space-x-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-800">Delivering to Room {session.roomNumber}</span>
          </div>
          <p className="text-xs text-emerald-700">
            Guest: {session.guestName || 'Valued Guest'} &bull; Folio Direct Billing
          </p>
        </Card>

        {/* Order Items */}
        <Card className="p-4 divide-y divide-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-3">Selected Items</h2>
          {cart.map(ci => (
            <div key={ci.item.id} className="py-3 flex justify-between items-start first:pt-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  <span className="text-emerald-600 font-bold mr-1.5">{ci.quantity}x</span>
                  {ci.item.name}
                </p>
                <p className="text-xs text-slate-400">
                  {formatMoney(ci.item.priceMinor)} each
                </p>
              </div>
              <span className="text-sm font-bold text-slate-900">
                {formatMoney(ci.item.priceMinor * ci.quantity)}
              </span>
            </div>
          ))}
        </Card>

        {/* Special Notes */}
        <Card className="p-4 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Special Requests & Dietary Instructions
          </label>
          <textarea
            rows={2}
            value={specialNotes}
            onChange={(e) => setSpecialNotes(e.target.value)}
            placeholder="e.g. dressing on the side, extra ice, no cutlery required..."
            className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </Card>

        {/* Price Breakdown */}
        <Card className="p-4 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-medium text-slate-900">{formatMoney(subtotalMinor)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Room Service Tax (8%)</span>
            <span className="font-medium text-slate-900">{formatMoney(taxMinor)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Delivery Fee</span>
            <span className="font-medium text-emerald-600">Complimentary</span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
            <span>Total Billed to Room</span>
            <span className="text-base text-emerald-600">{formatMoney(totalMinor)}</span>
          </div>
        </Card>

        <div className="flex items-center space-x-2 text-xs text-slate-500 justify-center">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Charge directly settled to room folio upon checkout</span>
        </div>
      </div>

      {/* Persistent Order Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl max-w-lg mx-auto z-30">
        <Button
          variant="primary"
          onClick={handlePlaceOrder}
          disabled={isSubmitting}
          className="w-full py-3 text-base shadow-md"
        >
          {isSubmitting ? 'Submitting to Kitchen...' : `Confirm & Place Order (${formatMoney(totalMinor)})`}
        </Button>
      </div>
    </div>
  );
};
