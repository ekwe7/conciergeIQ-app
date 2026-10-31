import React, { useState } from 'react';
import { Button, Card, Badge } from '@conciergeiq/ui';
import { formatMoney } from '@conciergeiq/utils';
import { MenuItem, CartItem } from '@conciergeiq/contracts';
import { ArrowLeft, ShoppingBag, Plus, Minus, Check } from 'lucide-react';

interface MenuPageProps {
  onBack: () => void;
  onViewCart: () => void;
  cart: CartItem[];
  onAddToCart: (item: MenuItem) => void;
  onRemoveFromCart: (itemId: string) => void;
}

const SAMPLE_MENU: MenuItem[] = [
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

export const MenuPage: React.FC<MenuPageProps> = ({
  onBack,
  onViewCart,
  cart,
  onAddToCart,
  onRemoveFromCart,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const categories = ['All', 'Breakfast', 'Mains', 'Beverages', 'Desserts'];

  const filteredItems = activeCategory === 'All'
    ? SAMPLE_MENU
    : SAMPLE_MENU.filter(item => item.category === activeCategory);

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartMinor = cart.reduce((sum, item) => sum + item.item.priceMinor * item.quantity, 0);

  const getItemQuantity = (itemId: string): number => {
    const found = cart.find(ci => ci.item.id === itemId);
    return found ? found.quantity : 0;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-slate-700 hover:bg-slate-100 rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-slate-900">In-Room Dining</h1>
        <button
          onClick={onViewCart}
          className="relative p-2 -mr-2 text-slate-700 hover:bg-slate-100 rounded-full"
        >
          <ShoppingBag className="w-5 h-5" />
          {totalCartCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
              {totalCartCount}
            </span>
          )}
        </button>
      </div>

      {/* Category Pills */}
      <div className="bg-white px-4 py-2 flex space-x-2 overflow-x-auto border-b border-slate-100 no-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Item List */}
      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {filteredItems.map(item => {
          const qty = getItemQuantity(item.id);
          return (
            <Card key={item.id} className="p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">{item.name}</h3>
                    {item.dietary?.map(d => (
                      <Badge key={d} variant="info" className="mr-1 mt-1">
                        {d}
                      </Badge>
                    ))}
                  </div>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatMoney(item.priceMinor)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-medium text-slate-400">
                  {item.available ? (
                    <span className="text-emerald-600 font-medium flex items-center">
                      <Check className="w-3.5 h-3.5 mr-1" /> Ready in 20-30 min
                    </span>
                  ) : (
                    <Badge variant="danger">Sold Out (86'd)</Badge>
                  )}
                </span>

                {item.available && (
                  qty === 0 ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onAddToCart(item)}
                      className="px-3 py-1"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  ) : (
                    <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1">
                      <button
                        onClick={() => onRemoveFromCart(item.id)}
                        className="p-1 hover:bg-white rounded text-slate-700"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-slate-900 px-1">{qty}</span>
                      <button
                        onClick={() => onAddToCart(item)}
                        className="p-1 hover:bg-white rounded text-slate-700"
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
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl max-w-lg mx-auto z-30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">{totalCartCount} item{totalCartCount > 1 ? 's' : ''} in cart</p>
              <p className="text-base font-bold text-slate-900">{formatMoney(totalCartMinor)}</p>
            </div>
            <Button variant="primary" onClick={onViewCart} className="px-5">
              Review Cart &bull; Checkout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
