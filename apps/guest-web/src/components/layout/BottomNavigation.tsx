import React from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, UtensilsCrossed, ShoppingBag, Clock, Receipt } from 'lucide-react';

export interface NavigationItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  { to: '/', label: 'Welcome', icon: Compass, end: true },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/cart', label: 'Cart', icon: ShoppingBag },
  { to: '/orders', label: 'Orders', icon: Clock },
  { to: '/bill', label: 'Folio Bill', icon: Receipt },
];

/**
 * Mobile-first sticky bottom navigation bar.
 * Anchors to the bottom of the viewport with safe-area padding for home indicator notches.
 */
export const BottomNavigation: React.FC = () => {
  return (
    <nav
      aria-label="Guest Mobile Navigation"
      data-testid="guest-bottom-navigation"
      className="sticky bottom-0 z-30 w-full bg-surface/95 backdrop-blur-md border-t border-border padding-bottom-safe-area shadow-elevation-mid transition-colors print:hidden"
    >
      <div className="grid grid-cols-5 h-16 max-w-md mx-auto items-center px-1">
        {NAVIGATION_ITEMS.map((navigationItem) => {
          const NavigationIcon = navigationItem.icon;
          return (
            <NavLink
              key={navigationItem.to}
              to={navigationItem.to}
              end={navigationItem.end}
              className={({ isActive }) => {
                const activeClasses = isActive
                  ? 'text-brand font-semibold'
                  : 'text-text-muted hover:text-text';
                return `flex flex-col items-center justify-center h-full min-h-[44px] transition-colors gap-1 text-[11px] ${activeClasses}`;
              }}
            >
              <NavigationIcon className="w-5 h-5 shrink-0" />
              <span className="truncate max-w-[64px]">{navigationItem.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
