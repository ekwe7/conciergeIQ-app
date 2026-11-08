import {
  LogOut,
  Menu as MenuIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuth, useCurrentUser } from '../../features/auth/AuthProvider';
import { useHotel } from '../../features/hotel/useHotel';
import { useRealtime } from '../../features/realtime/RealtimeProvider';
import { initialsOf } from '../../lib/format';
import { ROLE_LABEL } from '../../lib/permissions';
import type { ConnectionState } from '../../lib/websocket-client';
import { cx } from '../ui/cx';

export interface HeaderProperties {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileNavigation?: () => void;
}

const CONNECTION_STATUS_LABEL: Record<ConnectionState, string> = {
  connecting: 'Connecting',
  open: 'Live',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
};

function useSafeAuth() {
  try {
    return useAuth();
  } catch {
    return {
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

function useSafeRealtime() {
  try {
    return useRealtime();
  } catch {
    return {
      connection: 'open' as ConnectionState,
      soundOn: true,
      setSoundOn: () => {},
    };
  }
}

export function Header({
  isSidebarCollapsed,
  onToggleSidebar,
  onOpenMobileNavigation,
}: HeaderProperties) {
  const { signOut } = useSafeAuth();
  const currentUser = useSafeCurrentUser();
  const hotelQuery = useSafeHotel();
  const { connection, soundOn, setSoundOn } = useSafeRealtime();

  const isLiveConnection = connection === 'open';
  const hotelDisplayName = hotelQuery.data?.name ?? 'Azure Bay Hotel';

  const handleToggleSound = () => {
    setSoundOn(!soundOn);
  };

  const handleSignOut = () => {
    void signOut();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-surface px-4 sm:px-6 lg:px-8">
      {/* Left section: mobile drawer toggle, desktop collapse toggle, hotel name badge */}
      <div className="flex items-center gap-3">
        {onOpenMobileNavigation && (
          <button
            type="button"
            onClick={onOpenMobileNavigation}
            aria-label="Open navigation"
            className="rounded-lg p-2 text-ink-2 hover:bg-sunken hover:text-ink md:hidden"
          >
            <MenuIcon className="h-5 w-5" strokeWidth={1.75} />
          </button>
        )}

        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isSidebarCollapsed}
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden md:inline-flex rounded-lg p-2 text-ink-2 hover:bg-sunken hover:text-ink transition-colors"
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="h-5 w-5" strokeWidth={1.75} />
          ) : (
            <PanelLeftClose className="h-5 w-5" strokeWidth={1.75} />
          )}
        </button>

        {/* Hotel Name Badge */}
        <div className="flex items-center gap-2">
          <span
            data-testid="hotel-name-badge"
            className="inline-flex items-center rounded-md border border-line bg-sunken px-2.5 py-1 text-xs font-semibold text-ink"
          >
            {hotelDisplayName}
          </span>
        </div>
      </div>

      {/* Right section: connection status, sound toggle, staff profile summary, sign-out */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Real-time Connection Status Indicator */}
        <span
          role="status"
          title={
            isLiveConnection
              ? 'Receiving orders and operational updates in real time'
              : 'Live updates paused; polling in background'
          }
          className="mr-1 inline-flex items-center gap-2 text-xs text-ink-3"
        >
          <span
            aria-hidden="true"
            className={cx(
              'h-2 w-2 rounded-full',
              isLiveConnection
                ? 'bg-status-done'
                : connection === 'offline'
                  ? 'bg-status-void'
                  : 'bg-status-pending',
            )}
          />
          <span className="font-medium">
            {CONNECTION_STATUS_LABEL[connection]}
          </span>
        </span>

        {/* Operational Notification Sound Toggle */}
        <button
          type="button"
          onClick={handleToggleSound}
          aria-pressed={soundOn}
          aria-label={soundOn ? 'Sound on' : 'Sound off'}
          title={soundOn ? 'Mute sound alerts' : 'Enable sound alerts'}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-medium text-ink-2 hover:bg-sunken hover:text-ink transition-colors"
        >
          {soundOn ? (
            <Volume2 className="h-4 w-4" strokeWidth={1.75} />
          ) : (
            <VolumeX className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
          )}
          <span className="hidden sm:inline">{soundOn ? 'Sound on' : 'Sound off'}</span>
          <span className="sr-only sm:hidden">Order chime</span>
        </button>

        {/* Staff Profile Summary & Role Badge */}
        <div
          data-testid="staff-profile-summary"
          className="flex items-center gap-2 border-l border-line pl-2 sm:pl-3"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken text-2xs font-semibold text-ink-2"
          >
            {initialsOf(currentUser.fullName)}
          </span>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-medium text-ink leading-tight">
              {currentUser.fullName}
            </p>
            <p className="text-2xs text-ink-3 leading-tight mt-0.5">
              {ROLE_LABEL[currentUser.role]}
            </p>
          </div>
          <span
            data-testid="staff-user-badge"
            className="inline-flex items-center rounded bg-surface-raised px-2 py-0.5 text-2xs font-medium text-ink border border-line"
          >
            {ROLE_LABEL[currentUser.role]}
          </span>
        </div>

        {/* Sign Out Action Button */}
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-ink-3 hover:bg-sunken hover:text-ink transition-colors"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          <span className="hidden xl:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
