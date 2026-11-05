import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, X } from 'lucide-react';
import { CartItem, MenuItem } from '@conciergeiq/contracts';
import { retrieveGuestSession } from '../features/guest-session';
import { useCartStore, CartBottomBar } from '../features/cart';
import { ChevronLeft, Search, ShoppingBag, X } from 'lucide-react';
import { CartItem, MenuItem } from '@conciergeiq/contracts';
import { retrieveGuestSession } from '../features/guest-session';
import {
  useGuestMenu,
  CategoryFilterTabs,
  MenuItemCard,
  ItemDetailModal,
  MenuSkeleton,
  EmptyCategoryView,
  GuestMenuItem,
  CustomizedCartItemPayload,
  formatCurrencyAmount,
} from '../features/menu';

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

  // Aggregate cart counters
  const totalCartCount = activeCart.reduce(
    (runningCount, cartEntry) => runningCount + cartEntry.quantity,
    0
  );
  const totalCartMinor = activeCart.reduce(
    (runningTotal, cartEntry) =>
      runningTotal + cartEntry.item.priceMinor * cartEntry.quantity,
    0
  );
  const formattedCartTotal = formatCurrencyAmount(totalCartMinor, 'NGN');

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
      {/* Floating Bottom Cart Bar (UI: G02) */}
      {totalCartCount > 0 && (
        <aside
          aria-label="Floating cart summary"
          className="fixed bottom-16 left-0 right-0 p-3.5 z-30 max-w-md mx-auto"
        >
          <button
            type="button"
            onClick={handleViewCartNavigation}
            aria-label={`View cart with ${totalCartCount} items totaling ${formattedCartTotal}`}
            data-testid="floating-view-cart-button"
            className="w-full py-3 px-4 rounded-2xl bg-slate-900 text-white font-bold text-xs flex items-center justify-between shadow-elevation-high hover:bg-slate-800 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[11px] flex items-center justify-center">
                {totalCartCount}
              </span>
              <span className="tracking-wide">View cart</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-extrabold text-sm">
                {formattedCartTotal}
              </span>
              <ShoppingBag className="w-4 h-4 text-white/80" />
            </div>
          </button>
        </aside>
      )}
    </div>
  );
};
