import {
  Navigate,
  createBrowserRouter,
  createMemoryRouter,
  type RouteObject,
} from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { RequireAuth, RequirePermission } from '../components/layout/Guards';
import { RealtimeProvider } from '../features/realtime/RealtimeProvider';
import { Permission } from '../lib/permissions';
import { ActivityPage } from '../pages/ActivityPage';
import { ConciergePage } from '../pages/ConciergePage';
import { EscalationsPage } from '../pages/EscalationsPage';
import { LoginPage } from '../pages/LoginPage';
import { MenuPage } from '../pages/MenuPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { OrdersPage } from '../pages/OrdersPage';
import { PaymentsPage } from '../pages/PaymentsPage';
import { QrCodesPage } from '../pages/QrCodesPage';
import { ReportsPage } from '../pages/ReportsPage';
import { RoomsPage } from '../pages/RoomsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { StaffPage } from '../pages/StaffPage';

const wrapWithProtectedRoute = (
  requiredPermission: Permission,
  pageElement: JSX.Element,
) => (
  <ProtectedRoute permission={requiredPermission}>
    {pageElement}
  </ProtectedRoute>
const wrapWithPermissionGuard = (
  requiredPermission: Permission,
  pageElement: JSX.Element,
) => (
  <RequirePermission permission={requiredPermission}>
    {pageElement}
  </RequirePermission>
);

export interface ApplicationRouterConfigurationOptions {
  initialEntries?: string[];
  initialIndex?: number;
}

export const dashboardRoutes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: (
      <ProtectedRoute renderAccessBanner={false}>
        <RealtimeProvider>
          <DashboardLayout />
        </RealtimeProvider>
      </ProtectedRoute>
      <RequireAuth>
        <RealtimeProvider>
          <DashboardLayout />
        </RealtimeProvider>
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/orders" replace />,
      },
      {
        path: 'orders',
        element: wrapWithProtectedRoute(
        element: wrapWithPermissionGuard(
          Permission.VIEW_AND_UPDATE_ORDERS,
          <OrdersPage />,
        ),
      },
      {
        path: 'rooms',
        element: wrapWithProtectedRoute(
        element: wrapWithPermissionGuard(
          Permission.VIEW_ROOMS,
          <RoomsPage />,
        ),
      },
      {
        path: 'menu',
        element: wrapWithProtectedRoute(
          Permission.MARK_ITEMS_UNAVAILABLE,
        element: wrapWithPermissionGuard(
          Permission.VIEW_MENU,
          <MenuPage />,
        ),
      },
      {
        path: 'payments',
        element: wrapWithProtectedRoute(
        element: wrapWithPermissionGuard(
          Permission.RECORD_PAYMENTS,
          <PaymentsPage />,
        ),
      },
      {
        path: 'qr-codes',
        element: wrapWithProtectedRoute(
        element: wrapWithPermissionGuard(
          Permission.MANAGE_ROOMS_AND_QR_CODES,
          <QrCodesPage />,
        ),
      },
      {
        path: 'staff',
        element: wrapWithProtectedRoute(
        element: wrapWithPermissionGuard(
          Permission.MANAGE_STAFF,
          <StaffPage />,
        ),
      },
      {
        path: 'activity',
        element: wrapWithProtectedRoute(
        element: wrapWithPermissionGuard(
          Permission.VIEW_ACTIVITY_LOG,
          <ActivityPage />,
        ),
      },
      {
        path: 'reports',
        element: wrapWithProtectedRoute(
        element: wrapWithPermissionGuard(
          Permission.VIEW_ACTIVITY_LOG,
          <ReportsPage />,
        ),
      },
      {
        path: 'escalations',
        element: wrapWithProtectedRoute(
        element: wrapWithPermissionGuard(
          Permission.VIEW_ACTIVITY_LOG,
          <EscalationsPage />,
        ),
      },
      {
        path: 'concierge',
        element: wrapWithProtectedRoute(
          Permission.EDIT_MENU,
        element: wrapWithPermissionGuard(
          Permission.MANAGE_CONCIERGE_CONTENT,
          <ConciergePage />,
        ),
      },
      {
        path: 'settings',
        element: wrapWithProtectedRoute(
        element: wrapWithPermissionGuard(
          Permission.MANAGE_HOTEL_SETTINGS,
          <SettingsPage />,
        ),
      },
      {
        path: 'dashboard',
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard/orders" replace />,
          },
          {
            path: 'orders',
            element: wrapWithProtectedRoute(
              Permission.VIEW_AND_UPDATE_ORDERS,
              <OrdersPage />,
            ),
          },
          {
            path: 'rooms',
            element: wrapWithProtectedRoute(
              Permission.VIEW_ROOMS,
              <RoomsPage />,
            ),
          },
          {
            path: 'menu',
            element: wrapWithProtectedRoute(
              Permission.EDIT_MENU,
              <MenuPage />,
            ),
          },
          {
            path: 'payments',
            element: wrapWithProtectedRoute(
              Permission.RECORD_PAYMENTS,
              <PaymentsPage />,
            ),
          },
          {
            path: 'qr-codes',
            element: wrapWithProtectedRoute(
              Permission.MANAGE_ROOMS_AND_QR_CODES,
              <QrCodesPage />,
            ),
          },
          {
            path: 'staff',
            element: wrapWithProtectedRoute(
              Permission.MANAGE_STAFF,
              <StaffPage />,
            ),
          },
          {
            path: 'activity',
            element: wrapWithProtectedRoute(
              Permission.VIEW_ACTIVITY_LOG,
              <ActivityPage />,
            ),
          },
          {
            path: 'reports',
            element: wrapWithProtectedRoute(
              Permission.VIEW_ACTIVITY_LOG,
              <ReportsPage />,
            ),
          },
          {
            path: 'escalations',
            element: wrapWithProtectedRoute(
              Permission.VIEW_ACTIVITY_LOG,
              <EscalationsPage />,
            ),
          },
          {
            path: 'concierge',
            element: wrapWithProtectedRoute(
              Permission.EDIT_MENU,
              <ConciergePage />,
            ),
          },
          {
            path: 'settings',
            element: wrapWithProtectedRoute(
              Permission.MANAGE_HOTEL_SETTINGS,
              <SettingsPage />,
            ),
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
];

export const routes: RouteObject[] = dashboardRoutes;

/**
 * Creates an application router instance for the dashboard web workspace.
 * Uses createMemoryRouter if initialEntries is supplied (ideal for testing),
 * otherwise defaults to createBrowserRouter for browser execution.
 */
export function createApplicationRouter(
  configurationOptions?: ApplicationRouterConfigurationOptions,
) {
  if (
    configurationOptions?.initialEntries &&
    configurationOptions.initialEntries.length > 0
  ) {
    return createMemoryRouter(dashboardRoutes, {
      initialEntries: configurationOptions.initialEntries,
      initialIndex: configurationOptions.initialIndex,
    });
  }

  return createBrowserRouter(dashboardRoutes);
}

export const applicationRouter = createApplicationRouter();
