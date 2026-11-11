import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AudioAlertManager } from '../../features/orders/components/AudioAlertManager';
import { useStaffWebSocket } from '../../features/orders/hooks/useStaffWebSocket';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

function getInitialSidebarCollapsedState(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const viewportWidth = window.innerWidth;
  // Tablets are 768px - 1024px
  return viewportWidth >= 768 && viewportWidth <= 1024;
}

export function DashboardLayout() {
  useStaffWebSocket();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(
    getInitialSidebarCollapsedState,
  );
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState<boolean>(false);
  const location = useLocation();

  // Close mobile drawer on route navigation
  useEffect(() => {
    setIsMobileNavigationOpen(false);
  }, [location.pathname]);

  // Automatically adapt sidebar collapse state for tablet viewports
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const tabletMediaQuery = window.matchMedia(
      '(min-width: 768px) and (max-width: 1024px)',
    );

    const handleMediaChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsSidebarCollapsed(event.matches);
    };

    if (tabletMediaQuery.matches) {
      setIsSidebarCollapsed(true);
    }

    if (tabletMediaQuery.addEventListener) {
      tabletMediaQuery.addEventListener('change', handleMediaChange);
      return () => {
        tabletMediaQuery.removeEventListener('change', handleMediaChange);
      };
    }
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((previousState) => !previousState);
  };

  const handleOpenMobileNavigation = () => {
    setIsMobileNavigationOpen(true);
  };

  const handleCloseMobileNavigation = () => {
    setIsMobileNavigationOpen(false);
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-row">
      {/* Keyboard Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only z-50 rounded bg-surface px-3 py-2 text-sm font-medium text-ink shadow-overlay focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      {/* Desktop and Tablet Sidebar */}
      <div className="hidden md:block shrink-0">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      </div>

      {/* Mobile Off-Canvas Drawer Navigation */}
      {isMobileNavigationOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-scrim"
            aria-hidden="true"
            onClick={handleCloseMobileNavigation}
          />
          <div className="relative h-full w-64 border-r border-line bg-surface shadow-overlay">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={handleCloseMobileNavigation}
              className="absolute right-2 top-3 z-50 rounded p-1.5 text-ink-3 hover:bg-sunken"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <Sidebar
              isCollapsed={false}
              onToggleCollapse={handleToggleSidebar}
              isMobileOpen={true}
              onCloseMobile={handleCloseMobileNavigation}
            />
          </div>
        </div>
      )}

      {/* Main Operational Workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          onOpenMobileNavigation={handleOpenMobileNavigation}
        />

        <AudioAlertManager />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-4 py-6 focus:outline-none sm:px-8 sm:py-8"
        >
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
