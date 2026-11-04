import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge } from '@conciergeiq/ui';
import { formatMoney } from '@conciergeiq/utils';
import { MenuItem, CartItem } from '@conciergeiq/contracts';
import { ArrowLeft, ShoppingBag, Plus, Minus, Check } from 'lucide-react';

export interface MenuPageProperties {
  onBack?: () => void;
  onViewCart?: () => void;
  cart?: CartItem[];
  onAddToCart?: (menuItem: MenuItem) => void;
  onRemoveFromCart?: (menuItemId: string) => void;
}

const SAMPLE_MENU_ITEMS: MenuItem[] = [
  {
    id: 'item_1',
    name: 'Artisan Avocado & Poached Egg Toast',
    description: 'Sourdough toast topped with smashed Haas avocado, organic poached eggs, and chili flakes.',
    priceMinor: 1600,
    category: 'Breakfast',
    available: true,
    dietary: ['Vegetarian'],
  },
  {
    id: 'item_2',
    name: 'Truffle Wagyu Burger & Crisp Fries',
    description: 'Dry-aged Wagyu patty, black truffle aioli, aged cheddar, served with sea-salted fries.',
    priceMinor: 2400,
    category: 'Mains',
    available: true,
    dietary: ['Signature'],
  },
  {
    id: 'item_3',
    name: 'Pan-Seared Atlantic Salmon',
    description: 'Wild salmon fillet served over roasted seasonal asparagus with lemon herb beurre blanc.',
    priceMinor: 2800,
    category: 'Mains',
    available: true,
    dietary: ['Gluten-Free'],
  },
  {
    id: 'item_4',
    name: 'Freshly Brewed Espresso & Croissant',
    description: 'Double shot of single-origin espresso paired with a warm, flaky butter croissant.',
    priceMinor: 950,
    category: 'Beverages',
    available: true,
  },
  {
    id: 'item_5',
    name: 'Seasonal Berry Pavlova',
    description: 'Crisp meringue nest with whipped vanilla mascarpone and fresh handpicked berries.',
    priceMinor: 1200,
    category: 'Desserts',
    available: false,
  },
];

export const MenuPage: React.FC<MenuPageProperties> = ({
  onBack,
  onViewCart,
  cart: externalCart,
  onAddToCart: externalAddToCart,
  onRemoveFromCart: externalRemoveFromCart,
}) => {
  const navigate = useNavigate();
  const [internalCart, setInternalCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const categoryList: string[] = ['All', 'Breakfast', 'Mains', 'Beverages', 'Desserts'];

  const activeCart = externalCart ?? internalCart;

  const handleAddToCart = (itemToAdd: MenuItem) => {
    if (externalAddToCart) {
      externalAddToCart(itemToAdd);
      return;
    }

    setInternalCart((previousCart) => {
      const existingItem = previousCart.find(
        (cartEntry) => cartEntry.item.id === itemToAdd.id
      );
      if (existingItem) {
        return previousCart.map((cartEntry) =>
          cartEntry.item.id === itemToAdd.id
            ? { ...cartEntry, quantity: cartEntry.quantity + 1 }
            : cartEntry
        );
      }
      return [...previousCart, { item: itemToAdd, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (targetItemId: string) => {
    if (externalRemoveFromCart) {
      externalRemoveFromCart(targetItemId);
      return;
    }

    setInternalCart((previousCart) => {
      const existingItem = previousCart.find(
        (cartEntry) => cartEntry.item.id === targetItemId
      );
      if (!existingItem) {
        return previousCart;
      }
      if (existingItem.quantity <= 1) {
        return previousCart.filter(
          (cartEntry) => cartEntry.item.id !== targetItemId
        );
      }
      return previousCart.map((cartEntry) =>
        cartEntry.item.id === targetItemId
          ? { ...cartEntry, quantity: cartEntry.quantity - 1 }
          : cartEntry
      );
    });
  };

  const handleBackNavigation = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  const handleViewCartNavigation = () => {
    if (onViewCart) {
      onViewCart();
    } else {
      navigate('/cart');
    }
  };

  const filteredMenuItems = activeCategory === 'All'
    ? SAMPLE_MENU_ITEMS
    : SAMPLE_MENU_ITEMS.filter((menuItem) => menuItem.category === activeCategory);

  const totalCartCount = activeCart.reduce(
    (runningCount, cartEntry) => runningCount + cartEntry.quantity,
    0
  );
  const totalCartMinor = activeCart.reduce(
    (runningTotal, cartEntry) =>
      runningTotal + cartEntry.item.priceMinor * cartEntry.quantity,
    0
  );

  const getItemQuantity = (targetItemId: string): number => {
    const matchedItem = activeCart.find(
      (cartEntry) => cartEntry.item.id === targetItemId
    );
    return matchedItem ? matchedItem.quantity : 0;
  };

  return (
    <div className="min-h-full flex flex-col justify-between pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Back"
          onClick={handleBackNavigation}
          className="p-2 -ml-2 text-text hover:bg-surface-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-text">In-Room Dining</h1>
        <button
          type="button"
          aria-label="View Cart"
          onClick={handleViewCartNavigation}
          className="relative p-2 -mr-2 text-text hover:bg-surface-muted rounded-full transition-colors"
        >
          <ShoppingBag className="w-5 h-5" />
          {totalCartCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-brand text-white rounded-full text-[10px] font-bold flex items-center justify-center">
              {totalCartCount}
            </span>
          )}
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="bg-surface px-4 py-2 flex space-x-2 overflow-x-auto border-b border-border no-scrollbar">
        {categoryList.map((categoryName) => (
          <button
            key={categoryName}
            type="button"
            onClick={() => setActiveCategory(categoryName)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategory === categoryName
                ? 'bg-brand text-white'
                : 'bg-surface-muted text-text-muted hover:bg-border/50'
            }`}
          >
            {categoryName}
          </button>
        ))}
      </div>

      {/* Menu Item List */}
      <div className="p-4 space-y-3 max-w-lg mx-auto w-full flex-1">
        {filteredMenuItems.map((menuItem) => {
          const itemQuantity = getItemQuantity(menuItem.id);
          return (
            <Card key={menuItem.id} className="p-4 flex flex-col justify-between space-y-3 shadow-elevation-low">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-text text-sm">{menuItem.name}</h3>
                    {menuItem.dietary?.map((dietaryLabel) => (
                      <Badge key={dietaryLabel} variant="info" className="mr-1 mt-1">
                        {dietaryLabel}
                      </Badge>
                    ))}
                  </div>
                  <span className="font-bold text-text text-sm shrink-0">
                    {formatMoney(menuItem.priceMinor, 'USD')}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                  {menuItem.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs font-medium text-text-muted">
                  {menuItem.available ? (
                    <span className="text-brand font-medium flex items-center">
                      <Check className="w-3.5 h-3.5 mr-1" /> Ready in 20-30 min
                    </span>
                  ) : (
                    <Badge variant="danger">Sold Out (86'd)</Badge>
                  )}
                </span>

                {menuItem.available && (
                  itemQuantity === 0 ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAddToCart(menuItem)}
                      className="px-3 py-1"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  ) : (
                    <div className="flex items-center space-x-2 bg-surface-muted border border-border rounded-lg p-1">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => handleRemoveFromCart(menuItem.id)}
                        className="p-1 hover:bg-surface rounded text-text transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-text px-1">{itemQuantity}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => handleAddToCart(menuItem)}
                        className="p-1 hover:bg-surface rounded text-text transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Floating Bottom Cart Bar */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-surface/95 backdrop-blur-md border-t border-border shadow-elevation-high max-w-md mx-auto z-20">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-text-muted">
                {totalCartCount} {totalCartCount > 1 ? 'items' : 'item'} in cart
              </p>
              <p className="text-base font-bold text-text">
                {formatMoney(totalCartMinor, 'USD')}
              </p>
            </div>
            <Button variant="primary" size="md" onClick={handleViewCartNavigation} className="px-5">
              Review Cart &bull; Checkout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
