import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Trash2,
  Minus,
  Plus,
  ShieldCheck,
  CreditCard,
  UtensilsCrossed,
  MessageSquare,
  Edit2,
  Check,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { CartItem, GuestSession, Order } from '@conciergeiq/contracts';
import { useCartStore, CartLineItem, calculateCartTotals } from '../features/cart';
import { retrieveGuestSession } from '../features/guest-session';
import { formatCurrencyAmount } from '../features/menu/types';
import {
  usePlaceOrder,
  mapCartLinesToOrderPayload,
  PlacedOrderResponse,
} from '../features/orders';

export interface CartPageProperties {
  onBack?: () => void;
  cart?: CartItem[] | CartLineItem[];
  session?: GuestSession;
  onClearCart?: () => void;
  onOrderSuccess?: (placedOrder: Order) => void;
  onNavigateToMenu?: () => void;
  onPlaceOrder?: () => void;
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
  roomNumber: '101',
  roomNumber: '402',
  stayId: 'stay_demo_9921',
  hotelId: 'htl_lagos_grand',
  hotelName: 'The Lagos Grand Hotel & Suites',
  guestName: 'Adeola Johnson',
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};

/**
 * Returns an emoji visual and background tint matching food categories.
 */
function getCartFoodVisual(itemName: string): { emoji: string; backgroundColor: string } {
  const lowercaseName = itemName.toLowerCase();

  if (lowercaseName.includes('burger') || lowercaseName.includes('sandwich')) {
    return { emoji: '🍔', backgroundColor: '#F9E0D6' };
  }
  if (lowercaseName.includes('rice') || lowercaseName.includes('jollof')) {
    return { emoji: '🍛', backgroundColor: '#FDEBD3' };
  }
  if (lowercaseName.includes('soup') || lowercaseName.includes('egusi')) {
    return { emoji: '🍲', backgroundColor: '#E8F0DA' };
  }
  if (lowercaseName.includes('salad')) {
    return { emoji: '🥗', backgroundColor: '#DDF1E8' };
  }
  if (lowercaseName.includes('pasta') || lowercaseName.includes('spaghetti')) {
    return { emoji: '🍝', backgroundColor: '#F3E3F0' };
  }
  if (lowercaseName.includes('toast') || lowercaseName.includes('egg') || lowercaseName.includes('pancake')) {
    return { emoji: '🍳', backgroundColor: '#FEF3C7' };
  }
  if (lowercaseName.includes('dessert') || lowercaseName.includes('cake') || lowercaseName.includes('pavlova')) {
    return { emoji: '🍰', backgroundColor: '#FCE7F3' };
  }
  if (lowercaseName.includes('chapman') || lowercaseName.includes('beverage') || lowercaseName.includes('drink')) {
    return { emoji: '🥤', backgroundColor: '#DDEBF7' };
  }

  return { emoji: '🍽️', backgroundColor: '#F3F4F6' };
}

/**
 * Guest Shopping Cart & Order Review Screen matching prototype UI: G04.
 * Displays persistent cart line items with inline quantity steppers, per-item note editing,
 * tentative minor arithmetic tax/service breakdowns, clear pricing disclaimers,
 * and direct folio settlement expectations.
 */
export const CartPage: React.FC<CartPageProperties> = ({
  onBack,
  cart: externalCart,
  session: externalSession,
export const CartPage: React.FC<CartPageProperties> = ({
  onBack,
  cart = [],
  session = DEFAULT_GUEST_SESSION,
  onClearCart,
  onOrderSuccess,
  onNavigateToMenu,
  onPlaceOrder,
}) => {
  const navigate = useNavigate();
  const activeSessionFromStore = retrieveGuestSession();
  const effectiveSession: GuestSession =
    externalSession ??
    (activeSessionFromStore
      ? {
          token: activeSessionFromStore.sessionToken,
          roomNumber: activeSessionFromStore.roomNumber,
          stayId: activeSessionFromStore.stayId,
          hotelId: activeSessionFromStore.hotelId,
          hotelName: activeSessionFromStore.hotelName,
          guestName: activeSessionFromStore.guestName,
          expiresAt: activeSessionFromStore.expiresAt,
        }
      : DEFAULT_GUEST_SESSION);

  // Zustand Store Integration
  const storeLineItems = useCartStore((storeState) => storeState.lineItems);
  const updateQuantity = useCartStore((storeState) => storeState.updateQuantity);
  const removeItem = useCartStore((storeState) => storeState.removeItem);
  const updateSpecialInstructions = useCartStore(
    (storeState) => storeState.updateSpecialInstructions
  );
  const clearStoreCart = useCartStore((storeState) => storeState.clearCart);

  // Note editing state: maps lineIdentifier -> boolean or draft string
  const [editingLineIdentifier, setEditingLineIdentifier] = useState<string | null>(null);
  const [draftNoteValue, setDraftNoteValue] = useState<string>('');
  const [submissionErrorMessage, setSubmissionErrorMessage] = useState<string | null>(null);

  // TanStack Query Order Placement Mutation
  const placeOrderMutation = usePlaceOrder({
    onSuccessCallback: (placedOrderResponse: PlacedOrderResponse) => {
      // Clear cart ONLY upon successful server creation (HTTP 201)
      clearStoreCart();

      if (onClearCart) {
        onClearCart();
      }

      const resolvedOrderId =
        placedOrderResponse.id || placedOrderResponse.order?.id || 'order_created';

      if (onOrderSuccess) {
        const synthesizedOrder: Order = placedOrderResponse.order ?? {
          id: resolvedOrderId,
          roomNumber: effectiveSession.roomNumber,
          stayId: effectiveSession.stayId,
          hotelId: effectiveSession.hotelId,
          status: 'PENDING',
          items: displayLineItems.map((lineEntry) => ({
            itemId: lineEntry.item.id,
            name: lineEntry.item.name,
            quantity: lineEntry.quantity,
            unitPriceMinor: lineEntry.item.priceMinor,
            totalMinor: lineEntry.item.priceMinor * lineEntry.quantity,
            specialInstructions: lineEntry.specialInstructions,
          })),
          subtotalMinor: subtotalMinorUnits,
          taxMinor: estimatedTaxMinorUnits,
          totalMinor: estimatedTotalMinorUnits,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        onOrderSuccess(synthesizedOrder);
      } else {
        navigate(`/orders/${resolvedOrderId}`);
      }
    },
    onErrorCallback: (caughtError: Error) => {
      // Display user-friendly error toast and keep cart items intact
      const userFacingErrorMessage =
        caughtError.message && caughtError.message.trim().length > 0
          ? caughtError.message
          : 'Unable to submit your room dining order. Please verify your items and try again.';
      setSubmissionErrorMessage(userFacingErrorMessage);
    },
  });

  const isCheckoutInFlight = placeOrderMutation.isPending;

  // Use external cart if supplied via props, otherwise connect to Zustand store
  const isExternallyControlled = Boolean(externalCart);

  const displayLineItems: CartLineItem[] = useMemo(() => {
    if (isExternallyControlled && externalCart) {
      return (externalCart as (CartItem | CartLineItem)[]).map(
        (candidateEntry, entryIndex) => {
          if ('lineIdentifier' in candidateEntry) {
            return candidateEntry;
          }
          return {
            lineIdentifier: `external_line_${candidateEntry.item.id}_${entryIndex}`,
            item: candidateEntry.item,
            quantity: candidateEntry.quantity,
            specialInstructions: candidateEntry.specialInstructions,
          };
        }
      );
    }
    return storeLineItems;
  }, [externalCart, isExternallyControlled, storeLineItems]);

  // Compute totals
  const {
    subtotalMinorUnits,
    serviceChargeMinorUnits,
    estimatedTaxMinorUnits,
    estimatedTotalMinorUnits,
  } = useMemo(() => calculateCartTotals(displayLineItems), [displayLineItems]);

  const formattedSubtotal = formatCurrencyAmount(subtotalMinorUnits, 'NGN');
  const formattedServiceCharge = formatCurrencyAmount(serviceChargeMinorUnits, 'NGN');
  const formattedTax = formatCurrencyAmount(estimatedTaxMinorUnits, 'NGN');
  const formattedEstimatedTotal = formatCurrencyAmount(estimatedTotalMinorUnits, 'NGN');
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

  const handleBrowseMenuNavigation = () => {
    if (onNavigateToMenu) {
      onNavigateToMenu();
    } else if (onBack) {
      onBack();
    } else {
      navigate('/menu');
    }
  };

  const handleClearAllCart = () => {
    if (onClearCart) {
      onClearCart();
    }
    clearStoreCart();
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

  const handleIncrementLineQuantity = (lineItem: CartLineItem) => {
    updateQuantity(lineItem.lineIdentifier, lineItem.quantity + 1);
  };

  const handleDecrementLineQuantity = (lineItem: CartLineItem) => {
    if (lineItem.quantity <= 1) {
      removeItem(lineItem.lineIdentifier);
      return;
    }
    updateQuantity(lineItem.lineIdentifier, lineItem.quantity - 1);
  };

  const handleStartEditingNote = (lineItem: CartLineItem) => {
    setEditingLineIdentifier(lineItem.lineIdentifier);
    setDraftNoteValue(lineItem.specialInstructions || '');
  };

  const handleSaveNote = (lineIdentifier: string) => {
    updateSpecialInstructions(lineIdentifier, draftNoteValue);
    setEditingLineIdentifier(null);
    setDraftNoteValue('');
  };

  const handleCancelEditingNote = () => {
    setEditingLineIdentifier(null);
    setDraftNoteValue('');
  };

  const handleCheckoutSubmit = () => {
    if (isCheckoutInFlight || displayLineItems.length === 0) {
      return;
    }

    setSubmissionErrorMessage(null);

    if (onPlaceOrder) {
      onPlaceOrder();
      return;
    }

    const orderPayload = mapCartLinesToOrderPayload(
      effectiveSession.roomNumber,
      effectiveSession.stayId,
      displayLineItems
    );

    placeOrderMutation.mutate({
      payload: orderPayload,
      sessionToken: effectiveSession.token,
    });
  };

  // 1. Empty Cart State
  if (displayLineItems.length === 0) {
    return (
      <div
        data-testid="cart-empty-view"
        className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none"
      >
        <div className="w-16 h-16 bg-surface-muted rounded-full flex items-center justify-center text-text-muted mb-4 border border-border shadow-elevation-low">
          <UtensilsCrossed className="w-8 h-8 text-text-muted" />
        </div>

        <h2 className="text-xl font-bold text-text mb-1">Your cart is empty</h2>
        <p className="text-xs text-text-muted max-w-xs mb-6 leading-relaxed">
          Explore our in-room dining menu and add your favorite dishes to begin your order.
        </p>

        <button
          type="button"
          onClick={handleBrowseMenuNavigation}
          className="px-6 py-3 rounded-xl bg-brand hover:bg-brand-strong text-white font-bold text-sm shadow-elevation-mid active:scale-95 transition-all"
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
          Browse Menu
        </button>
      </div>
    );
  }

  // 2. Populated Cart View (UI: G04)
  return (
    <div
      data-testid="cart-populated-view"
      className="min-h-full flex flex-col justify-between pb-32 bg-surface"
    >
      {/* Top Header matching Prototype G04 */}
      <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label="Back to menu"
            onClick={handleBackNavigation}
            className="w-8 h-8 rounded-full border border-border bg-surface-muted text-text flex items-center justify-center hover:bg-border transition-colors active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-text">Your order</h1>
            <p className="text-[10px] text-text-muted leading-none">In-Room Dining</p>
          </div>
        </div>

        {/* Room Identification & Clear Cart */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold shadow-elevation-low">
            Room {effectiveSession.roomNumber}
          </span>
          <button
            type="button"
            aria-label="Clear all cart items"
            onClick={handleClearAllCart}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline px-1 py-1"
          >
            Clear
          </button>
        </div>
      </header>

      {/* Main Order Content */}
      <main className="p-4 space-y-4 max-w-md mx-auto w-full flex-1">
        {/* Line Items List (UI: G04) */}
        <section
          aria-label="Cart items"
          className="rounded-2xl border border-border bg-surface shadow-elevation-low overflow-hidden divide-y divide-border"
        >
          {displayLineItems.map((lineItem) => {
            const lineTotalMinor = lineItem.item.priceMinor * lineItem.quantity;
            const formattedLineTotal = formatCurrencyAmount(lineTotalMinor, 'NGN');
            const foodVisual = getCartFoodVisual(lineItem.item.name);
            const isEditingNote = editingLineIdentifier === lineItem.lineIdentifier;

            return (
              <div
                key={lineItem.lineIdentifier}
                data-testid={`cart-line-item-${lineItem.lineIdentifier}`}
                className="p-3.5 flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Food Visual Thumbnail */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-elevation-low overflow-hidden"
                    style={{ backgroundColor: foodVisual.backgroundColor }}
                  >
                    {lineItem.item.imageUrl ? (
                      <img
                        src={lineItem.item.imageUrl}
                        alt={lineItem.item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span role="img" aria-label={lineItem.item.name}>
                        {foodVisual.emoji}
                      </span>
                    )}
                  </div>

                  {/* Item Description & Notes */}
                  <div className="flex-1 min-w-0 pr-1">
                    <h3 className="font-bold text-xs text-text truncate">
                      {lineItem.item.name}
                    </h3>

                    {/* Preparation Notes Preview */}
                    {lineItem.specialInstructions && !isEditingNote && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MessageSquare className="w-3 h-3 text-brand shrink-0" />
                        <p className="text-[11px] text-text-muted truncate">
                          {lineItem.specialInstructions}
                        </p>
                        <button
                          type="button"
                          aria-label={`Edit note for ${lineItem.item.name}`}
                          onClick={() => handleStartEditingNote(lineItem)}
                          className="p-0.5 text-text-muted hover:text-text"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}

                    {!lineItem.specialInstructions && !isEditingNote && (
                      <button
                        type="button"
                        onClick={() => handleStartEditingNote(lineItem)}
                        className="text-[10px] text-brand hover:underline mt-0.5 block"
                      >
                        + Add note
                      </button>
                    )}

                    {/* Price Calculation */}
                    <div className="mt-1">
                      <span className="font-bold text-xs text-text">
                        {formattedLineTotal}
                      </span>
                    </div>
                  </div>

                  {/* Inline Quantity Stepper (`-` / `+`) */}
                  <div className="flex items-center gap-1.5 bg-surface-muted border border-border rounded-xl p-1 shrink-0">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${lineItem.item.name}`}
                      onClick={() => handleDecrementLineQuantity(lineItem)}
                      className="w-7 h-7 rounded-lg bg-surface text-text flex items-center justify-center hover:bg-border/50 active:scale-95 transition-all"
                    >
                      {lineItem.quantity <= 1 ? (
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      ) : (
                        <Minus className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <span
                      data-testid={`quantity-counter-${lineItem.lineIdentifier}`}
                      className="w-5 text-center text-xs font-bold text-text"
                    >
                      {lineItem.quantity}
                    </span>

                    <button
                      type="button"
                      aria-label={`Increase quantity of ${lineItem.item.name}`}
                      disabled={lineItem.quantity >= 20}
                      onClick={() => handleIncrementLineQuantity(lineItem)}
                      className="w-7 h-7 rounded-lg bg-surface text-text flex items-center justify-center hover:bg-border/50 disabled:opacity-30 active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline Note Editing Drawer */}
                {isEditingNote && (
                  <div className="pt-2 border-t border-border/60 flex flex-col gap-1.5">
                    <label
                      htmlFor={`note-input-${lineItem.lineIdentifier}`}
                      className="text-[11px] font-bold text-text"
                    >
                      Kitchen note:
                    </label>
                    <input
                      id={`note-input-${lineItem.lineIdentifier}`}
                      type="text"
                      maxLength={200}
                      value={draftNoteValue}
                      onChange={(inputEvent) => setDraftNoteValue(inputEvent.target.value)}
                      placeholder="e.g. less pepper, dressing on side..."
                      className="w-full text-xs p-2 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCancelEditingNote}
                        className="px-2.5 py-1 rounded-md text-[11px] text-text-muted hover:bg-surface-muted"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveNote(lineItem.lineIdentifier)}
                        className="px-3 py-1 rounded-md text-[11px] font-bold bg-brand text-white flex items-center gap-1 shadow-elevation-low"
                      >
                        <Check className="w-3 h-3" />
                        <span>Save Note</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* Tentative Pricing Breakdown Card (UI: G04) */}
        <section
          aria-label="Order financial summary"
          className="rounded-2xl border border-border bg-surface p-4 shadow-elevation-low space-y-2.5"
        >
          <div className="flex justify-between items-center text-xs text-text-muted">
            <span>Subtotal</span>
            <span className="font-semibold text-text">{formattedSubtotal}</span>
          </div>

          <div className="flex justify-between items-center text-xs text-text-muted">
            <span>Service charge (10%)</span>
            <span className="font-semibold text-text">{formattedServiceCharge}</span>
          </div>

          <div className="flex justify-between items-center text-xs text-text-muted">
            <span>VAT (7.5%)</span>
            <span className="font-semibold text-text">{formattedTax}</span>
          </div>

          <div className="pt-2 border-t border-border flex justify-between items-center">
            <span className="text-sm font-bold text-text">Estimated Total</span>
            <span
              data-testid="cart-order-estimated-total"
              className="text-lg font-extrabold text-brand-strong"
            >
              {formattedEstimatedTotal}
            </span>
          </div>
        </section>

        {/* Payment & Folio Direct Billing Confirmation Card (UI: G04) */}
        <section className="rounded-2xl border border-border bg-surface p-3.5 shadow-elevation-low flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 shadow-elevation-low">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-text">Pay at the front desk</h4>
            <p className="text-[11px] text-text-muted truncate mt-0.5">
              Cash, card or transfer &bull; Added to Room {effectiveSession.roomNumber}
            </p>
          </div>
        </section>

        {/* Authoritative Pricing & Delivery Disclaimer Notice */}
        <section
          data-testid="cart-pricing-disclaimer"
          className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 text-sky-950 flex items-start gap-2.5"
        >
          <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed space-y-0.5">
            <p className="font-bold text-sky-900">
              Final price and room delivery confirmed upon submission
            </p>
            <p className="text-sky-800/80">
              Tapping twice won't create a duplicate order. All prices and room taxes are verified by the hotel server.
            </p>
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
        </section>
      </main>

      {/* User-friendly Error Toast Notification */}
      {submissionErrorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          data-testid="order-submission-error-toast"
          className="fixed top-4 left-4 right-4 max-w-md mx-auto z-50 bg-rose-50 border border-rose-300 text-rose-900 rounded-2xl p-4 shadow-elevation-high flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-rose-950">Order Submission Failed</h4>
            <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
              {submissionErrorMessage}
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss error notification"
            onClick={() => setSubmissionErrorMessage(null)}
            className="p-1 text-rose-700 hover:text-rose-950 rounded-lg hover:bg-rose-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        <div className="flex items-center space-x-2 text-xs text-text-muted justify-center">
          <ShieldCheck className="w-4 h-4 text-brand" />
          <span>Charge directly settled to room folio upon checkout</span>
        </div>
      )}

      {/* Fixed Sticky Action Footer (UI: G04) */}
      <footer className="fixed bottom-0 left-0 right-0 p-3.5 bg-surface/95 backdrop-blur-md border-t border-border shadow-elevation-high max-w-md mx-auto z-30 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))]">
        <button
          type="button"
          disabled={isCheckoutInFlight}
          onClick={handleCheckoutSubmit}
          data-testid="place-order-checkout-button"
          aria-busy={isCheckoutInFlight}
          className="w-full py-3.5 px-4 rounded-2xl bg-brand hover:bg-brand-strong text-white font-bold text-sm flex items-center justify-center gap-2 shadow-elevation-mid active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {isCheckoutInFlight ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Submitting order...</span>
            </>
          ) : (
            <span>Place order &bull; {formattedEstimatedTotal}</span>
          )}
        </button>
      </footer>
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
