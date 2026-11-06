import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { CartItem } from '@conciergeiq/contracts';
import { useCartStore } from '../store';
import { CartLineItem, calculateCartTotals } from '../types';
import { formatCurrencyAmount } from '../../menu/types';

export interface CartBottomBarProperties {
  onViewCart?: () => void;
  cart?: CartItem[] | CartLineItem[];
  className?: string;
}

/**
 * Mobile-first sticky floating cart trigger bar matching prototype UI: G02.
 * Floats immediately above device safe-area bottom insets whenever cart items count >= 1.
 * Provides instant feedback of item quantity, estimated running total, and direct navigation.
 */
export const CartBottomBar: React.FC<CartBottomBarProperties> = ({
  onViewCart,
  cart: externalCart,
  className = '',
}) => {
  const navigate = useNavigate();
  const storeLineItems = useCartStore((storeState) => storeState.lineItems);

  const effectiveItems = externalCart ?? storeLineItems;

  const { totalItemCount, estimatedTotalMinorUnits } = useMemo(() => {
    if (externalCart) {
      const runningCount = externalCart.reduce(
        (totalCount, cartEntry) => totalCount + cartEntry.quantity,
        0
      );
      const runningTotal = externalCart.reduce(
        (accumulatedTotal, cartEntry) =>
          accumulatedTotal + cartEntry.item.priceMinor * cartEntry.quantity,
        0
      );
      return {
        totalItemCount: runningCount,
        estimatedTotalMinorUnits: runningTotal,
      };
    }

    const calculatedTotals = calculateCartTotals(storeLineItems);
    return {
      totalItemCount: calculatedTotals.totalItemCount,
      estimatedTotalMinorUnits: calculatedTotals.estimatedTotalMinorUnits,
    };
  }, [externalCart, storeLineItems]);

  const formattedRunningTotal = formatCurrencyAmount(estimatedTotalMinorUnits, 'NGN');

  // Do not render floating trigger bar when the shopping cart is empty
  if (totalItemCount === 0 || effectiveItems.length === 0) {
    return null;
  }

  const handleBarClick = () => {
    if (onViewCart) {
      onViewCart();
      return;
    }
    navigate('/cart');
  };

  return (
    <aside
      aria-label="Shopping cart quick summary"
      data-testid="cart-bottom-bar"
      className={`fixed bottom-16 left-0 right-0 p-3.5 z-30 max-w-md mx-auto pointer-events-none select-none pb-[calc(4rem+env(safe-area-inset-bottom,0px))] ${className}`}
    >
      <button
        type="button"
        onClick={handleBarClick}
        data-testid="floating-view-cart-button"
        aria-label={`View cart with ${totalItemCount} items totaling ${formattedRunningTotal}`}
        className="pointer-events-auto w-full py-3.5 px-4 rounded-2xl bg-slate-900 text-white font-bold text-xs flex items-center justify-between shadow-elevation-high hover:bg-slate-800 active:scale-[0.99] transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        {/* Left Count Badge & Label */}
        <div className="flex items-center gap-2.5">
          <span
            data-testid="cart-badge-count"
            className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[11px] flex items-center justify-center shadow-elevation-low"
          >
            {totalItemCount}
          </span>
          <span className="tracking-wide text-white text-xs font-bold">
            View cart
          </span>
        </div>

        {/* Right Running Estimated Total & Bag Icon */}
        <div className="flex items-center gap-2">
          <span
            data-testid="cart-running-total"
            className="text-amber-400 font-extrabold text-sm tracking-tight"
          >
            {formattedRunningTotal}
          </span>
          <ShoppingBag className="w-4 h-4 text-white/80" />
        </div>
      </button>
    </aside>
  );
};
