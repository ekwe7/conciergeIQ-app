import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, X } from 'lucide-react';
import { CartItem, MenuItem } from '@conciergeiq/contracts';
import { retrieveGuestSession } from '../features/guest-session';
import { useCartStore, CartBottomBar } from '../features/cart';
import {
  useGuestMenu,
  CategoryFilterTabs,
  MenuItemCard,
  ItemDetailModal,
  MenuSkeleton,
  EmptyCategoryView,
  GuestMenuItem,
  CustomizedCartItemPayload,
} from '../features/menu';
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
  onAddToCart?: (customizedItem: CustomizedCartItemPayload | MenuItem) => void;
  onRemoveFromCart?: (menuItemId: string) => void;
  initialCategory?: string;
  isLoading?: boolean;
  menuItems?: GuestMenuItem[];
}

/**
 * Mobile-first Guest Menu Catalog Browsing Page matching prototype UI: G02.
 * Integrates categorized browsing, real-time availability filters, instant search,
 * sticky category chips, interactive item customizer modal (G03),
 * and a floating running-total cart summary bar.
 */
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
  initialCategory = 'All',
  isLoading: externalIsLoading,
  menuItems: externalMenuItems,
}) => {
  const navigate = useNavigate();
  const activeSession = retrieveGuestSession();
  const roomNumber = activeSession?.roomNumber || '101';

  // Cart internal state when not externally managed
  const [internalCart, setInternalCart] = useState<CartItem[]>([]);
  const activeCart = externalCart ?? internalCart;

  // Active category & search filter state
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Item customization modal state (UI: G03)
  const [selectedItemForCustomization, setSelectedItemForCustomization] =
    useState<GuestMenuItem | null>(null);
  const [isCustomizationModalOpen, setIsCustomizationModalOpen] =
    useState<boolean>(false);

  // TanStack Query menu data hook
  const {
    menuItems: fetchedMenuItems,
    categories,
    isLoading: isQueryLoading,
    isError,
    refetch,
  } = useGuestMenu({
    initialData: externalMenuItems,
  });

  const menuItems = externalMenuItems ?? fetchedMenuItems;
  const isMenuLoading = externalIsLoading ?? isQueryLoading;

  const addItemToCartStore = useCartStore((storeState) => storeState.addItem);

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

  const handleOpenItemDetail = (targetMenuItem: GuestMenuItem) => {
    setSelectedItemForCustomization(targetMenuItem);
    setIsCustomizationModalOpen(true);
  };

  const handleCloseItemDetail = () => {
    setIsCustomizationModalOpen(false);
    setSelectedItemForCustomization(null);
  };

  const handleAddToCartFromModal = (
    customizedPayload: CustomizedCartItemPayload
  ) => {
    if (externalAddToCart) {
      externalAddToCart(customizedPayload);
    }

    // Persist to Zustand cart store
    addItemToCartStore(
      customizedPayload.item,
      customizedPayload.quantity,
      customizedPayload.specialInstructions
    );

    setInternalCart((previousCart) => {
      const existingCartEntry = previousCart.find(
        (cartEntry) =>
          cartEntry.item.id === customizedPayload.item.id &&
          (cartEntry.specialInstructions || '') ===
            (customizedPayload.specialInstructions || '')
      );

      if (existingCartEntry) {
        return previousCart.map((cartEntry) =>
          cartEntry === existingCartEntry
            ? {
                ...cartEntry,
                quantity: cartEntry.quantity + customizedPayload.quantity,
              }
            : cartEntry
        );
      }

      const newCartEntry: CartItem = {
        item: customizedPayload.item,
        quantity: customizedPayload.quantity,
        specialInstructions: customizedPayload.specialInstructions || undefined,
      };

      return [...previousCart, newCartEntry];
    });
  };

  // Filter menu items by active category and search keyword
  const filteredMenuItems = useMemo(() => {
    let resultItems = menuItems;

    if (activeCategory !== 'All') {
      resultItems = resultItems.filter(
        (menuItem) =>
          menuItem.category.toLowerCase() === activeCategory.toLowerCase()
      );
    }

    if (searchQuery.trim().length > 0) {
      const normalizedQuery = searchQuery.trim().toLowerCase();
      resultItems = resultItems.filter(
        (menuItem) =>
          menuItem.name.toLowerCase().includes(normalizedQuery) ||
          menuItem.description.toLowerCase().includes(normalizedQuery)
      );
    }

    return resultItems;
  }, [menuItems, activeCategory, searchQuery]);

  const normalizedPanelIdentifier = `category-panel-${activeCategory.toLowerCase().replace(/\s+/g, '-')}`;
  const associatedTabIdentifier = `category-tab-${activeCategory.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="min-h-full flex flex-col justify-between pb-28 bg-surface">
      {/* Top Mobile Header (UI: G02) */}
      <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label="Back to welcome screen"
            onClick={handleBackNavigation}
            className="w-8 h-8 rounded-full border border-border bg-surface-muted text-text flex items-center justify-center hover:bg-border transition-colors active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
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
          <div>
            <h1 className="text-sm font-bold text-text">Room service</h1>
            <p className="text-[10px] text-text-muted leading-none">
              In-Room Dining
            </p>
          </div>
        </div>

        {/* Room Identification Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold shadow-elevation-low">
          <span>Room {roomNumber}</span>
        </div>
      </header>

      {/* Search Input Bar (UI: G02) */}
      <div className="px-4 pt-3 pb-1">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(inputEvent) => setSearchQuery(inputEvent.target.value)}
            placeholder="Search the menu"
            aria-label="Search the menu"
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-border bg-surface text-text text-xs placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all shadow-elevation-low"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              aria-label="Clear search input"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 p-1 text-text-muted hover:text-text rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Sticky Category Tabs (UI: G02) */}
      <CategoryFilterTabs
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={(selectedCategory) => {
          setActiveCategory(selectedCategory);
        }}
      />

      {/* Active Category Header and Operating Hours */}
      <div className="px-4 pt-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold font-serif text-text">
          {activeCategory === 'All' ? 'Full Catalog' : activeCategory}
        </h2>
        <span className="text-[11px] text-text-muted">
          Served 11:00 &ndash; 23:00
        </span>
      </div>

      {/* Content Region: Skeleton vs Empty vs Item Cards */}
      <main
        role="tabpanel"
        id={normalizedPanelIdentifier}
        aria-labelledby={associatedTabIdentifier}
        className="px-4 py-2 space-y-2.5 max-w-md mx-auto w-full flex-1"
      >
        {isMenuLoading ? (
          <MenuSkeleton />
        ) : isError ? (
          <div
            data-testid="menu-error-view"
            className="p-6 text-center space-y-3 bg-rose-50 border border-rose-200 rounded-2xl my-4"
          >
            <p className="text-xs font-semibold text-rose-800">
              Failed to load in-room dining catalog.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white shadow-elevation-low"
            >
              Retry
            </button>
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
        ) : filteredMenuItems.length === 0 ? (
          <EmptyCategoryView
            categoryName={activeCategory}
            searchQuery={searchQuery}
            onResetFilter={() => {
              setActiveCategory('All');
              setSearchQuery('');
            }}
          />
        ) : (
          filteredMenuItems.map((menuItem) => (
            <MenuItemCard
              key={menuItem.id}
              menuItem={menuItem}
              onSelectItem={handleOpenItemDetail}
            />
          ))
        )}
      </main>

      {/* Interactive Item Customization Modal (UI: G03) */}
      <ItemDetailModal
        isOpen={isCustomizationModalOpen}
        menuItem={selectedItemForCustomization}
        onClose={handleCloseItemDetail}
        onAddToCart={handleAddToCartFromModal}
      />

      {/* Persistent Sticky Cart Trigger Bar (UI: G02 & G04) */}
      <CartBottomBar
        onViewCart={handleViewCartNavigation}
        cart={externalCart}
      />
    </div>
  );
};
