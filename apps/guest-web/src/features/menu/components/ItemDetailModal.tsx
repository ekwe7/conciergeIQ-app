import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Plus, Utensils, MessageSquare } from 'lucide-react';
import {
  GuestMenuItem,
  CustomizedCartItemPayload,
  formatCurrencyAmount,
  isMenuItemAvailable,
} from '../types';

export interface ItemDetailModalProperties {
  isOpen: boolean;
  menuItem: GuestMenuItem | null;
  onClose: () => void;
  onAddToCart: (customizedItem: CustomizedCartItemPayload) => void;
}

const MINIMUM_QUANTITY: number = 1;
const MAXIMUM_QUANTITY: number = 20;
const MAXIMUM_NOTES_CHARACTER_LENGTH: number = 200;
const TOUCH_DISMISS_THRESHOLD_PIXELS: number = 80;

/**
 * Slide-up Bottom Sheet Item Customizer matching prototype UI: G03.
 * Features:
 * - WAI-ARIA accessible modal dialog (`role="dialog"`, `aria-modal="true"`).
 * - Keyboard `Escape` key dismissal.
 * - Native touch swipe-down drag to dismiss.
 * - Strict quantity bounds stepper (min 1, max 20).
 * - Special instructions kitchen notes with 200-character counter.
 * - Running total price recalculation.
 */
export const ItemDetailModal: React.FC<ItemDetailModalProperties> = ({
  isOpen,
  menuItem,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState<number>(MINIMUM_QUANTITY);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [touchDragDistance, setTouchDragDistance] = useState<number>(0);

  const touchStartYReference = useRef<number | null>(null);
  const modalContentReference = useRef<HTMLDivElement | null>(null);

  // Reset state when opening a new item
  useEffect(() => {
    if (isOpen) {
      setQuantity(MINIMUM_QUANTITY);
      setSpecialInstructions('');
      setTouchDragDistance(0);
    }
  }, [isOpen, menuItem]);

  // Handle keyboard 'Escape' key dismissal
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') {
        keyboardEvent.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !menuItem) {
    return null;
  }

  const isAvailable = isMenuItemAvailable(menuItem);
  const totalItemMinor = menuItem.priceMinor * quantity;
  const formattedTotal = formatCurrencyAmount(
    totalItemMinor,
    menuItem.currency || 'NGN'
  );
  const charactersRemaining = MAXIMUM_NOTES_CHARACTER_LENGTH - specialInstructions.length;

  const handleDecrementQuantity = () => {
    setQuantity((previousQuantity) =>
      Math.max(MINIMUM_QUANTITY, previousQuantity - 1)
    );
  };

  const handleIncrementQuantity = () => {
    setQuantity((previousQuantity) =>
      Math.min(MAXIMUM_QUANTITY, previousQuantity + 1)
    );
  };

  const handleSpecialInstructionsChange = (
    changeEvent: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const rawValue = changeEvent.target.value;
    if (rawValue.length <= MAXIMUM_NOTES_CHARACTER_LENGTH) {
      setSpecialInstructions(rawValue);
    }
  };

  const handleAddToCartClick = () => {
    if (!isAvailable) {
      return;
    }

    onAddToCart({
      item: menuItem,
      quantity,
      specialInstructions: specialInstructions.trim(),
    });

    onClose();
  };

  // Touch handlers for mobile swipe-down dismissal
  const handleTouchStart = (touchEvent: React.TouchEvent<HTMLDivElement>) => {
    if (touchEvent.touches.length > 0) {
      touchStartYReference.current = touchEvent.touches[0].clientY;
    }
  };

  const handleTouchMove = (touchEvent: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartYReference.current === null || touchEvent.touches.length === 0) {
      return;
    }

    const currentY = touchEvent.touches[0].clientY;
    const deltaY = currentY - touchStartYReference.current;

    // Only allow downward drag
    if (deltaY > 0) {
      setTouchDragDistance(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (touchDragDistance >= TOUCH_DISMISS_THRESHOLD_PIXELS) {
      onClose();
    }
    touchStartYReference.current = null;
    setTouchDragDistance(0);
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
      onClick={onClose}
    >
      {/* Modal Dialog Content Container */}
      <div
        ref={modalContentReference}
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-detail-title"
        aria-describedby="item-detail-description"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateY(${Math.max(0, touchDragDistance)}px)`,
          transition: touchDragDistance === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
        className="w-full max-w-md bg-surface rounded-t-3xl shadow-elevation-high max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250 select-none"
      >
        {/* Swipe-Down Drag Indicator Pill */}
        <div className="w-full pt-3 pb-1 flex justify-center items-center cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 rounded-full bg-border" />
        </div>

        {/* Hero Visual Banner with Close Button */}
        <div className="relative h-48 bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center overflow-hidden border-b border-border/50 shrink-0">
          {menuItem.imageUrl ? (
            <img
              src={menuItem.imageUrl}
              alt={menuItem.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-7xl">
              {menuItem.name.toLowerCase().includes('burger')
                ? '🍔'
                : menuItem.name.toLowerCase().includes('pasta')
                ? '🍝'
                : menuItem.name.toLowerCase().includes('soup')
                ? '🍲'
                : menuItem.name.toLowerCase().includes('salad')
                ? '🥗'
                : '🍛'}
            </div>
          )}

          {/* Accessible Close Button */}
          <button
            type="button"
            aria-label="Close item customizer"
            onClick={onClose}
            className="absolute top-3 left-3 w-9 h-9 rounded-full bg-surface/90 backdrop-blur-md text-text flex items-center justify-center shadow-elevation-low hover:bg-surface active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Item Title and Price Heading */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2
                id="item-detail-title"
                className="text-xl font-bold text-text leading-tight"
              >
                {menuItem.name}
              </h2>
              <span className="text-lg font-extrabold text-brand-strong shrink-0">
                {formattedTotal}
              </span>
            </div>

            <p
              id="item-detail-description"
              className="text-xs text-text-muted leading-relaxed mt-1.5"
            >
              {menuItem.description}
            </p>
          </div>

          {/* Ingredient Details / Dietary Pills */}
          {menuItem.ingredients && menuItem.ingredients.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-text-muted">
                <Utensils className="w-3.5 h-3.5 text-brand" />
                <span>Ingredients</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {menuItem.ingredients.map((ingredientName) => (
                  <span
                    key={ingredientName}
                    className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-muted text-text-muted border border-border"
                  >
                    {ingredientName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Special Instructions Kitchen Note Input */}
          <div className="space-y-1.5 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label
                htmlFor="kitchen-preparation-notes"
                className="flex items-center gap-1.5 text-xs font-bold text-text"
              >
                <MessageSquare className="w-3.5 h-3.5 text-brand" />
                <span>Note for the kitchen</span>
              </label>
              <span className="text-[10px] text-text-muted">
                {charactersRemaining} characters remaining
              </span>
            </div>

            <textarea
              id="kitchen-preparation-notes"
              rows={2}
              maxLength={MAXIMUM_NOTES_CHARACTER_LENGTH}
              value={specialInstructions}
              onChange={handleSpecialInstructionsChange}
              placeholder="Less pepper please, extra plantain 🙏"
              className="w-full p-3 rounded-xl border border-border bg-surface text-text text-xs placeholder-text-muted/60 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all resize-none"
            />
            <p className="text-[10px] text-text-muted">
              Special instructions or allergy requests sent directly to the chef ticket.
            </p>
          </div>
        </div>

        {/* Sticky Action Footer: Quantity Stepper & Add to Cart */}
        <div className="p-4 bg-surface border-t border-border flex items-center gap-3 shrink-0">
          {/* Quantity Stepper (Min 1, Max 20) */}
          <div
            role="group"
            aria-label="Quantity selector"
            className="flex items-center gap-2 bg-surface-muted border border-border rounded-xl p-1.5 shrink-0"
          >
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={quantity <= MINIMUM_QUANTITY}
              onClick={handleDecrementQuantity}
              className="w-8 h-8 rounded-lg bg-surface text-text flex items-center justify-center hover:bg-border/40 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <span
              data-testid="quantity-counter-value"
              className="w-6 text-center text-sm font-bold text-text"
            >
              {quantity}
            </span>

            <button
              type="button"
              aria-label="Increase quantity"
              disabled={quantity >= MAXIMUM_QUANTITY}
              onClick={handleIncrementQuantity}
              className="w-8 h-8 rounded-lg bg-surface text-text flex items-center justify-center hover:bg-border/40 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add to Cart Primary Button */}
          <button
            type="button"
            disabled={!isAvailable}
            onClick={handleAddToCartClick}
            data-testid="add-to-cart-submit-button"
            className="flex-1 py-3 px-4 rounded-xl bg-brand hover:bg-brand-strong text-white font-bold text-sm flex items-center justify-center gap-2 shadow-elevation-mid transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
          >
            <span>Add to cart &bull; {formattedTotal}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
