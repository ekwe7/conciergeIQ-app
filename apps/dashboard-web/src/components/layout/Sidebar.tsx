import { StaffRole } from '@conciergeiq/contracts';
import {
  BarChart3,
  BedDouble,
  BellRing,
  CreditCard,
  LayoutGrid,
  LogOut,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
  ScrollText,
  Settings,
  UsersRound,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import { useAuth, useCurrentUser } from '../../features/auth/AuthProvider';
import { useHotel } from '../../features/hotel/useHotel';
import { useOrders } from '../../features/orders/api';
import { useOutstanding } from '../../features/payments/api';
import { initialsOf } from '../../lib/format';
import { Permission, ROLE_LABEL, roleCan } from '../../lib/permissions';
import { Permission, ROLE_LABEL } from '../../lib/permissions';
import { cx } from '../ui/cx';

export interface SidebarProperties {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export interface NavigationItemDescriptor {
interface NavigationItemDescriptor {
  to: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
  count?: number;
}

function HotelBellIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 18h18M5 18a7 7 0 0 1 14 0M12 8V6M10 6h4" />
    </svg>
  );
}

function useSafeAuth() {
  try {
    return useAuth();
  } catch {
    return {
      can: (requiredPermission: Permission) => roleCan(StaffRole.ADMIN, requiredPermission),
      can: () => true,
      signOut: async () => {},
    };
  }
}

function useSafeCurrentUser() {
  try {
    return useCurrentUser();
  } catch {
    return {
      id: 'staff-placeholder-id',
      fullName: 'Amaka Obi',
      email: 'amaka@azurebay.test',
      role: StaffRole.ADMIN,
      role: 'ADMIN' as const,
      hotelId: 'hotel-1',
      isActive: true,
    };
  }
}

function useSafeHotel() {
  try {
    return useHotel();
  } catch {
    return { data: { name: 'Azure Bay Hotel' } };
  }
}

function useSafeOrders() {
  try {
    return useOrders();
  } catch {
    return { data: [] };
  }
}

function useSafeOutstanding(canRecordPayments: boolean) {
  try {
    return useOutstanding(canRecordPayments);
  } catch {
    return { data: [] };
  }
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProperties) {
  const { signOut } = useSafeAuth();
  const currentUser = useSafeCurrentUser();
  const hotelQuery = useSafeHotel();
  const ordersQuery = useSafeOrders();
  const canUserRecordPayments = roleCan(currentUser.role, Permission.RECORD_PAYMENTS);
  const outstandingPaymentsQuery = useSafeOutstanding(canUserRecordPayments);
  const { can, signOut } = useSafeAuth();
  const currentUser = useSafeCurrentUser();
  const hotelQuery = useSafeHotel();
  const ordersQuery = useSafeOrders();
  const outstandingPaymentsQuery = useSafeOutstanding(can(Permission.RECORD_PAYMENTS));

  const pendingOrdersCount = ordersQuery.data?.filter(
    (orderItem) => orderItem.status === 'PENDING',
  ).length;

  const operationalNavigationItems: NavigationItemDescriptor[] = [
    {
      to: '/orders',
      label: 'Live orders',
      icon: LayoutGrid,
      permission: Permission.VIEW_AND_UPDATE_ORDERS,
      count: pendingOrdersCount,
    },
    {
      to: '/rooms',
      label: 'Rooms & stays',
      icon: BedDouble,
      permission: Permission.VIEW_ROOMS,
    },
    {
      to: '/menu',
      label: 'Menu management',
      icon: UtensilsCrossed,
      permission: Permission.EDIT_MENU,
      label: 'Menu',
      icon: UtensilsCrossed,
      permission: Permission.VIEW_MENU,
    },
    {
      to: '/payments',
      label: 'Payments',
      icon: CreditCard,
      permission: Permission.RECORD_PAYMENTS,
      count: outstandingPaymentsQuery.data?.length,
    },
  ];

  const administrativeNavigationItems: NavigationItemDescriptor[] = [
    {
      to: '/qr-codes',
      label: 'Rooms & QR codes',
      icon: QrCode,
      permission: Permission.MANAGE_ROOMS_AND_QR_CODES,
    },
    {
      to: '/staff',
      label: 'Staff',
      icon: UsersRound,
      permission: Permission.MANAGE_STAFF,
    },
    {
      to: '/activity',
      label: 'Activity log',
      icon: ScrollText,
      permission: Permission.VIEW_ACTIVITY_LOG,
    },
    {
      to: '/reports',
      label: 'Reports',
      icon: BarChart3,
      permission: Permission.VIEW_ACTIVITY_LOG,
    },
    {
      to: '/escalations',
      label: 'Escalations',
      icon: BellRing,
      permission: Permission.VIEW_ACTIVITY_LOG,
    },
    {
      to: '/concierge',
      label: 'Concierge answers',
      icon: MessagesSquare,
      permission: Permission.EDIT_MENU,
    },
    {
      to: '/settings',
      label: 'Hotel settings',
      permission: Permission.MANAGE_CONCIERGE_CONTENT,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
      permission: Permission.MANAGE_HOTEL_SETTINGS,
    },
  ];

  const visibleOperationalItems = operationalNavigationItems.filter(
    (navigationItem) => roleCan(currentUser.role, navigationItem.permission),
  );

  const visibleAdministrativeItems = administrativeNavigationItems.filter(
    (navigationItem) => roleCan(currentUser.role, navigationItem.permission),
    (navigationItem) => can(navigationItem.permission),
  );

  const visibleAdministrativeItems = administrativeNavigationItems.filter(
    (navigationItem) => can(navigationItem.permission),
  );

  const hotelDisplayName = hotelQuery.data?.name ?? 'Azure Bay Hotel';

  return (
    <aside
      aria-label="Sidebar navigation"
      className={cx(
        'sticky top-0 h-screen shrink-0 border-r border-line bg-surface flex flex-col transition-[width] duration-200 ease-in-out',
        isCollapsed ? 'w-16 sm:w-20' : 'w-60 lg:w-64',
      )}
    >
      {/* Brand Header */}
      <div
        className={cx(
          'flex h-16 items-center border-b border-line px-4',
          isCollapsed ? 'justify-center' : 'justify-between',
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brass text-white shadow-sm"
            title="ConciergeIQ"
          >
            <HotelBellIcon className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold tracking-tight text-ink leading-tight">
                Concierge<span className="text-brass">IQ</span>
              </p>
              <p
                className="mt-0.5 truncate text-xs text-ink-3"
                title={hotelDisplayName}
              >
                {hotelDisplayName}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 sm:px-3 py-4 space-y-4">
        {visibleOperationalItems.length > 0 && (
          <div>
            {!isCollapsed && (
              <p className="mb-1.5 px-2 text-2xs font-medium tracking-wider text-ink-3 uppercase">
                Operations
              </p>
            )}
            <ul className="space-y-1">
              {visibleOperationalItems.map((navigationItem) => (
                <li key={navigationItem.to}>
                  <NavigationLinkItem
                    navigationItem={navigationItem}
                    isCollapsed={isCollapsed}
                    onNavigate={onCloseMobile}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {visibleAdministrativeItems.length > 0 && (
          <div>
            {!isCollapsed && (
              <p className="mb-1.5 px-2 text-2xs font-medium tracking-wider text-ink-3 uppercase">
                Administration
              </p>
            )}
            <ul className="space-y-1">
              {visibleAdministrativeItems.map((navigationItem) => (
                <li key={navigationItem.to}>
                  <NavigationLinkItem
                    navigationItem={navigationItem}
                    isCollapsed={isCollapsed}
                    onNavigate={onCloseMobile}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {/* Sidebar Collapse Toggle Button */}
      <div className="border-t border-line p-2 sm:p-3">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cx(
            'flex w-full items-center rounded-lg text-ink-3 hover:bg-sunken hover:text-ink transition-colors',
            isCollapsed
              ? 'h-10 justify-center p-0'
              : 'h-9 px-3 py-2 gap-3 text-xs font-medium',
          )}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="truncate">Collapse sidebar</span>
            </>
          )}
        </button>
      </div>

      {/* Staff Profile Footer */}
      <div
        className={cx(
          'flex items-center border-t border-line p-3',
          isCollapsed ? 'justify-center' : 'gap-3',
        )}
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken text-2xs font-semibold text-ink-2"
          title={currentUser.fullName}
        >
          {initialsOf(currentUser.fullName)}
        </span>

        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-ink leading-tight">
              {currentUser.fullName}
            </p>
            <p className="text-xs text-ink-3 leading-tight mt-0.5">
              {ROLE_LABEL[currentUser.role]}
            </p>
          </div>
        )}

        {!isCollapsed && (
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="Sign out"
            title="Sign out"
            className="rounded p-1.5 text-ink-3 hover:bg-sunken hover:text-ink transition-colors"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
      </div>
    </aside>
  );
}

function NavigationLinkItem({
  navigationItem,
  isCollapsed,
  onNavigate,
}: {
  navigationItem: NavigationItemDescriptor;
  isCollapsed: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const dashboardAliasPath = `/dashboard${navigationItem.to}`;
  const isDashboardAliasActive =
    location.pathname === dashboardAliasPath ||
    location.pathname.startsWith(`${dashboardAliasPath}/`);

  return (
    <NavLink
      to={navigationItem.to}
      onClick={onNavigate}
      aria-current={isDashboardAliasActive ? 'page' : undefined}
      className={({ isActive }) => {
        const isRouteActive = isActive || isDashboardAliasActive;
        return cx(
      className={({ isActive }) =>
        cx(
          'group relative flex items-center rounded-lg text-[13px] transition-colors',
          isCollapsed
            ? 'h-10 w-10 justify-center mx-auto'
            : 'h-9 px-2.5 py-1.5 gap-3',
          isRouteActive
            ? 'bg-sunken font-medium text-ink'
            : 'text-ink-2 hover:bg-canvas hover:text-ink',
        );
      }}
      title={isCollapsed ? navigationItem.label : undefined}
    >
      {({ isActive }) => {
        const isRouteActive = isActive || isDashboardAliasActive;
        return (
          <>
            <navigationItem.icon
              className={cx(
                'h-4 w-4 shrink-0 transition-colors',
                isRouteActive ? 'text-ink' : 'text-ink-3 group-hover:text-ink',
              )}
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span
              className={cx(
                isCollapsed
                  ? 'sr-only'
                  : 'flex-1 truncate',
              )}
            >
              {navigationItem.label}
            </span>
            {!isCollapsed && navigationItem.count ? (
              <span
                className="tabular text-xs text-ink-3 font-medium"
                aria-label={`${navigationItem.count} waiting`}
              >
                {navigationItem.count}
              </span>
            ) : null}
            {isCollapsed && navigationItem.count ? (
              <span
                className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-status-pending"
                aria-label={`${navigationItem.count} waiting`}
              />
            ) : null}
          </>
        );
      }}
          isActive
            ? 'bg-sunken font-medium text-ink'
            : 'text-ink-2 hover:bg-canvas hover:text-ink',
        )
      }
      title={isCollapsed ? navigationItem.label : undefined}
    >
      {({ isActive }) => (
        <>
          <navigationItem.icon
            className={cx(
              'h-4 w-4 shrink-0 transition-colors',
              isActive ? 'text-ink' : 'text-ink-3 group-hover:text-ink',
            )}
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span
            className={cx(
              isCollapsed
                ? 'sr-only'
                : 'flex-1 truncate',
            )}
          >
            {navigationItem.label}
          </span>
          {!isCollapsed && navigationItem.count ? (
            <span
              className="tabular text-xs text-ink-3 font-medium"
              aria-label={`${navigationItem.count} waiting`}
            >
              {navigationItem.count}
            </span>
          ) : null}
          {isCollapsed && navigationItem.count ? (
            <span
              className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-status-pending"
              aria-label={`${navigationItem.count} waiting`}
            />
          ) : null}
        </>
      )}
    </NavLink>
  );
}
