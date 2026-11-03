import React, { useState } from 'react';
import { WelcomePage } from './pages/WelcomePage';
import { MenuPage } from './pages/MenuPage';
import { CartPage } from './pages/CartPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { GuestSession, MenuItem, CartItem, Order } from '@conciergeiq/contracts';

const DEFAULT_SESSION: GuestSession = {
  token: 'qr_demo_token_8829',
  roomNumber: '402',
  stayId: 'stay_demo_9921',
  hotelId: 'htl_lagos_grand',
  hotelName: 'The Lagos Grand Hotel & Suites',
  guestName: 'Adeola Johnson',
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'welcome' | 'menu' | 'cart' | 'tracking'>('welcome');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const handleAddToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(ci => ci.item.id === item.id);
      if (existing) {
        return prev.map(ci =>
          ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(ci => ci.item.id === itemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter(ci => ci.item.id !== itemId);
      }
      return prev.map(ci =>
        ci.item.id === itemId ? { ...ci, quantity: ci.quantity - 1 } : ci
      );
    });
  };

  const handleClearCart = () => setCart([]);

  const handleOrderSuccess = (order: Order) => {
    setActiveOrder(order);
    setCurrentPage('tracking');
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 shadow-2xl relative font-sans">
      {currentPage === 'welcome' && (
        <WelcomePage session={DEFAULT_SESSION} onNavigate={(p) => setCurrentPage(p as any)} />
      )}
      {currentPage === 'menu' && (
        <MenuPage
          onBack={() => setCurrentPage('welcome')}
          onViewCart={() => setCurrentPage('cart')}
          cart={cart}
          onAddToCart={handleAddToCart}
          onRemoveFromCart={handleRemoveFromCart}
        />
      )}
      {currentPage === 'cart' && (
        <CartPage
          onBack={() => setCurrentPage('menu')}
          cart={cart}
          session={DEFAULT_SESSION}
          onClearCart={handleClearCart}
          onOrderSuccess={handleOrderSuccess}
        />
      )}
      {currentPage === 'tracking' && (
        <OrderTrackingPage
          order={activeOrder}
          onBackToMenu={() => setCurrentPage('menu')}
        />
      )}
    </div>
  );
};

export default App;
