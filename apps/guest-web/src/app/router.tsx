import React from 'react';
import {
  createBrowserRouter,
  createMemoryRouter,
  RouteObject,
} from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { WelcomePage } from '../pages/WelcomePage';
import { MenuPage } from '../pages/MenuPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { OrderHistoryPage } from '../pages/OrderHistoryPage';
import { OrderTrackingPage } from '../pages/OrderTrackingPage';
import { DigitalBillPage } from '../pages/DigitalBillPage';
import { FolioBillPage } from '../pages/FolioBillPage';
import { AmenitiesPage } from '../pages/AmenitiesPage';
import { ErrorRecoveryPage } from '../pages/ErrorRecoveryPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export interface ApplicationRouterConfigurationOptions {
  initialEntries?: string[];
  initialIndex?: number;
}

export const applicationRoutes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <WelcomePage />,
      },
      {
        path: 'menu',
        element: <MenuPage />,
      },
      {
        path: 'cart',
        element: <CartPage />,
      },
      {
        path: 'checkout',
        element: <CheckoutPage />,
      },
      {
        path: 'orders',
        element: <OrderHistoryPage />,
      },
      {
        path: 'orders/:orderId',
        element: <OrderTrackingPage />,
      },
      {
        path: 'amenities',
        element: <AmenitiesPage />,
      },
      {
        path: 'bill',
        element: <DigitalBillPage />,
      },
      {
        path: 'error',
        element: <ErrorRecoveryPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
];

/**
 * Creates an application router instance.
 * Uses createMemoryRouter if initialEntries is supplied (ideal for tests and isolated previews),
 * otherwise defaults to createBrowserRouter for browser execution.
 */
export function createApplicationRouter(
  configurationOptions?: ApplicationRouterConfigurationOptions
) {
  if (
    configurationOptions?.initialEntries &&
    configurationOptions.initialEntries.length > 0
  ) {
    return createMemoryRouter(applicationRoutes, {
      initialEntries: configurationOptions.initialEntries,
      initialIndex: configurationOptions.initialIndex,
    });
  }

  return createBrowserRouter(applicationRoutes);
}

export const applicationRouter = createApplicationRouter();
