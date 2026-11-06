import { Navigate, type RouteObject } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
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
import { RoomsPage } from '../pages/RoomsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { StaffPage } from '../pages/StaffPage';

const guarded = (permission: Permission, element: JSX.Element) => (
  <RequirePermission permission={permission}>{element}</RequirePermission>
);

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <RequireAuth>
        <RealtimeProvider>
          <AppShell />
        </RealtimeProvider>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/orders" replace /> },
      { path: 'orders', element: guarded(Permission.VIEW_AND_UPDATE_ORDERS, <OrdersPage />) },
      { path: 'rooms', element: guarded(Permission.VIEW_ROOMS, <RoomsPage />) },
      { path: 'menu', element: guarded(Permission.VIEW_MENU, <MenuPage />) },
      { path: 'payments', element: guarded(Permission.RECORD_PAYMENTS, <PaymentsPage />) },
      { path: 'qr-codes', element: guarded(Permission.MANAGE_ROOMS_AND_QR_CODES, <QrCodesPage />) },
      { path: 'staff', element: guarded(Permission.MANAGE_STAFF, <StaffPage />) },
      { path: 'activity', element: guarded(Permission.VIEW_ACTIVITY_LOG, <ActivityPage />) },
      { path: 'escalations', element: guarded(Permission.VIEW_ACTIVITY_LOG, <EscalationsPage />) },
      { path: 'concierge', element: guarded(Permission.MANAGE_CONCIERGE_CONTENT, <ConciergePage />) },
      { path: 'settings', element: guarded(Permission.MANAGE_HOTEL_SETTINGS, <SettingsPage />) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
