import {
  BedDouble,
  CreditCard,
  LayoutGrid,
  LogOut,
  Menu as MenuIcon,
  QrCode,
  ScrollText,
  Settings,
  UsersRound,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth, useCurrentUser } from '../../features/auth/AuthProvider';
import { useHotel } from '../../features/hotel/useHotel';
import { useOrders } from '../../features/orders/api';
import { useOutstanding } from '../../features/payments/api';
import { useRealtime } from '../../features/realtime/RealtimeProvider';
import { initialsOf } from '../../lib/format';
import { Permission, ROLE_LABEL } from '../../lib/permissions';
import type { ConnectionState } from '../../lib/websocket-client';
import { cx } from '../ui/cx';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
  count?: number;
}

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setNavOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen lg:flex">
      <a
        href="#main"
        className="sr-only z-50 rounded bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-line bg-surface lg:block">
        <Sidebar />
      </aside>

      {navOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-scrim" aria-hidden="true" onClick={() => setNavOpen(false)} />
          <aside className="relative h-full w-64 border-r border-line bg-surface shadow-overlay">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setNavOpen(false)}
              className="absolute right-2 top-3 rounded p-1.5 text-ink-3 hover:bg-sunken"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <Sidebar />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenNav={() => setNavOpen(true)} />
        <main id="main" tabIndex={-1} className="flex-1 px-4 py-6 focus:outline-none sm:px-8 sm:py-8">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function Sidebar() {
  const { can, signOut } = useAuth();
  const user = useCurrentUser();
  const hotel = useHotel();
  const orders = useOrders();
  const outstanding = useOutstanding(can(Permission.RECORD_PAYMENTS));

  const pending = orders.data?.filter((order) => order.status === 'PENDING').length;

  const operations: NavItem[] = [
    { to: '/orders', label: 'Live orders', icon: LayoutGrid, permission: Permission.VIEW_AND_UPDATE_ORDERS, count: pending },
    { to: '/rooms', label: 'Rooms & stays', icon: BedDouble, permission: Permission.VIEW_ROOMS },
    { to: '/menu', label: 'Menu', icon: UtensilsCrossed, permission: Permission.VIEW_MENU },
    { to: '/payments', label: 'Payments', icon: CreditCard, permission: Permission.RECORD_PAYMENTS, count: outstanding.data?.length },
  ];
  const administration: NavItem[] = [
    { to: '/qr-codes', label: 'Rooms & QR codes', icon: QrCode, permission: Permission.MANAGE_ROOMS_AND_QR_CODES },
    { to: '/staff', label: 'Staff & roles', icon: UsersRound, permission: Permission.MANAGE_STAFF },
    { to: '/activity', label: 'Activity log', icon: ScrollText, permission: Permission.VIEW_ACTIVITY_LOG },
    { to: '/settings', label: 'Hotel settings', icon: Settings, permission: Permission.MANAGE_HOTEL_SETTINGS },
  ].filter((item) => can(item.permission));

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-5 py-4">
        <p className="text-[13px] font-semibold tracking-tight text-ink">ConciergeIQ</p>
        <p className="mt-0.5 truncate text-xs text-ink-3">{hotel.data?.name ?? ' '}</p>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        <NavGroup items={operations.filter((item) => can(item.permission))} />
        {administration.length > 0 && (
          <>
            <p className="mb-1 mt-6 px-2 text-2xs font-medium text-ink-3">Administration</p>
            <NavGroup items={administration} />
          </>
        )}
      </nav>

      <div className="flex items-center gap-3 border-t border-line px-4 py-3">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken text-2xs font-semibold text-ink-2"
        >
          {initialsOf(user.fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-ink">{user.fullName}</p>
          <p className="text-xs text-ink-3">{ROLE_LABEL[user.role]}</p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          aria-label="Sign out"
          title="Sign out"
          className="rounded p-1.5 text-ink-3 hover:bg-sunken hover:text-ink"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

function NavGroup({ items }: { items: NavItem[] }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            className={({ isActive }) =>
              cx(
                'flex h-9 items-center gap-3 rounded px-2 text-[13px] transition-colors',
                isActive ? 'bg-sunken font-medium text-ink' : 'text-ink-2 hover:bg-canvas hover:text-ink',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.75} aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            {item.count ? (
              <span className="tabular text-xs text-ink-3" aria-label={`${item.count} waiting`}>
                {item.count}
              </span>
            ) : null}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

const CONNECTION_LABEL: Record<ConnectionState, string> = {
  connecting: 'Connecting',
  open: 'Live',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
};

function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const { connection, soundOn, setSoundOn } = useRealtime();
  const live = connection === 'open';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 sm:px-8">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="-ml-1.5 rounded p-1.5 text-ink-2 hover:bg-sunken lg:hidden"
      >
        <MenuIcon className="h-5 w-5" strokeWidth={1.75} />
      </button>
      <span className="text-[13px] font-semibold text-ink lg:hidden">ConciergeIQ</span>

      <div className="ml-auto flex items-center gap-1">
        <span
          role="status"
          title={live ? 'Receiving orders as they are placed' : 'Updates are paused; the page refreshes every minute'}
          className="mr-2 inline-flex items-center gap-2 text-xs text-ink-3"
        >
          <span
            aria-hidden="true"
            className={cx('h-1.5 w-1.5 rounded-full', live ? 'bg-status-done' : connection === 'offline' ? 'bg-status-void' : 'bg-status-pending')}
          />
          {CONNECTION_LABEL[connection]}
        </span>
        <button
          type="button"
          onClick={() => setSoundOn(!soundOn)}
          aria-pressed={soundOn}
          className="inline-flex h-8 items-center gap-2 rounded px-2.5 text-xs text-ink-2 hover:bg-sunken hover:text-ink"
        >
          {soundOn ? <Volume2 className="h-4 w-4" strokeWidth={1.75} /> : <VolumeX className="h-4 w-4" strokeWidth={1.75} />}
          <span className="hidden sm:inline">{soundOn ? 'Sound on' : 'Sound off'}</span>
          <span className="sr-only sm:hidden">New order sound</span>
        </button>
      </div>
    </header>
  );
}
