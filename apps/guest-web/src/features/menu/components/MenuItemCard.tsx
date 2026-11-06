import React from 'react';
import { Plus, Ban } from 'lucide-react';
import {
  GuestMenuItem,
  isMenuItemAvailable,
  formatCurrencyAmount,
} from '../types';

export interface MenuItemCardProperties {
  menuItem: GuestMenuItem;
  onSelectItem: (selectedItem: GuestMenuItem) => void;
  className?: string;
}

/**
 * Returns an appropriate food emoji and background tint based on category or item name.
 */
function getFallbackFoodVisual(menuItem: GuestMenuItem): { emoji: string; backgroundColor: string } {
  const lowercaseName = menuItem.name.toLowerCase();
  const lowercaseCategory = menuItem.category.toLowerCase();

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
  if (lowercaseCategory.includes('breakfast') || lowercaseName.includes('toast') || lowercaseName.includes('egg')) {
    return { emoji: '🍳', backgroundColor: '#FEF3C7' };
  }
  if (lowercaseCategory.includes('dessert') || lowercaseName.includes('cake') || lowercaseName.includes('pavlova')) {
    return { emoji: '🍰', backgroundColor: '#FCE7F3' };
  }
  if (lowercaseCategory.includes('beverage') || lowercaseCategory.includes('drink') || lowercaseName.includes('chapman')) {
    return { emoji: '🥤', backgroundColor: '#E0F2FE' };
  }

  return { emoji: '🍽️', backgroundColor: '#F3F4F6' };
}

/**
 * Menu Item Card component matching prototype UI: G02.
 * Displays thumbnail, item title, description, formatted price, and dietary / out-of-stock badges.
 * When `isAvailable: false`, dims opacity and disables all tap interactions.
 */
export const MenuItemCard: React.FC<MenuItemCardProperties> = ({
  menuItem,
  onSelectItem,
  className = '',
}) => {
  const isAvailable = isMenuItemAvailable(menuItem);
  const formattedPrice =
    menuItem.formattedPrice ||
    formatCurrencyAmount(menuItem.priceMinor, menuItem.currency || 'NGN');
  const foodVisual = getFallbackFoodVisual(menuItem);

  const handleCardClick = () => {
    if (!isAvailable) {
      return;
    }
    onSelectItem(menuItem);
  };

  const handleKeyDown = (keyboardEvent: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isAvailable) {
      return;
    }
    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
      keyboardEvent.preventDefault();
      onSelectItem(menuItem);
    }
  };

  return (
    <div
      role="button"
      tabIndex={isAvailable ? 0 : -1}
      aria-disabled={!isAvailable}
      aria-label={`${menuItem.name}, ${formattedPrice}${!isAvailable ? ', currently unavailable' : ''}`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      data-testid={`menu-item-card-${menuItem.id}`}
      className={`group relative flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-surface border border-border transition-all duration-200 outline-none select-none ${
        isAvailable
          ? 'cursor-pointer hover:border-brand/40 hover:shadow-elevation-low active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-brand'
          : 'opacity-50 cursor-not-allowed pointer-events-none bg-surface-muted/60'
      } ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Food Thumbnail Visual */}
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shrink-0 shadow-elevation-low overflow-hidden relative"
          style={{ backgroundColor: foodVisual.backgroundColor }}
        >
          {menuItem.imageUrl ? (
            <img
              src={menuItem.imageUrl}
              alt={menuItem.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <span role="img" aria-label={menuItem.name}>
              {foodVisual.emoji}
            </span>
          )}

          {!isAvailable && (
            <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center text-white">
              <Ban className="w-5 h-5 text-white/90" />
            </div>
          )}
        </div>

        {/* Textual Details */}
        <div className="min-w-0 flex-1 pr-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-bold text-sm text-text truncate max-w-[200px]">
              {menuItem.name}
            </h3>

            {/* Popular or Dietary Badges */}
            {menuItem.isPopular && isAvailable && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                Popular
              </span>
            )}
            {menuItem.dietary && menuItem.dietary.length > 0 && isAvailable && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                {menuItem.dietary[0]}
              </span>
            )}
          </div>

          <p className="text-xs text-text-muted line-clamp-2 mt-0.5 leading-relaxed">
            {menuItem.description}
          </p>

          <div className="flex items-center gap-2 mt-1.5">
            <span className="font-bold text-xs text-text tracking-tight">
              {formattedPrice}
            </span>

            {/* Prominent Unavailable Badge */}
            {!isAvailable && (
              <span
                data-testid="item-unavailable-badge"
                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200"
              >
                Unavailable
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Action Tap Target */}
      {isAvailable && (
        <button
          type="button"
          aria-label={`Customize ${menuItem.name}`}
          tabIndex={-1}
          className="w-8 h-8 rounded-full bg-brand-50 text-brand-strong border border-brand/20 flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-white transition-colors duration-200 shadow-elevation-low"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
