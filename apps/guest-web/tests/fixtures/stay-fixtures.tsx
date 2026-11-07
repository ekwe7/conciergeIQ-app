import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Order, OrderStatus } from '@conciergeiq/contracts';
import { saveGuestSession } from '../../src/features/guest-session/session-store';

export const ACTIVE_STAY_IDENTIFIER: string = 'stay_active_402';
export const OTHER_STAY_IDENTIFIER: string = 'stay_other_guest_501';

export const STAY_BILL_ENDPOINT_PATTERN: RegExp = /\/api\/v1\/stays\/[^/]+\/bill$/;
export const GUEST_ORDERS_ENDPOINT_PATTERN: RegExp = /\/api\/v1\/guest\/orders$/;

export function saveActiveGuestSession(): void {
  saveGuestSession({
    sessionToken: 'guest_session_token_test',
    sessionId: ACTIVE_STAY_IDENTIFIER,
    hotelId: 'hotel_lagos_grand',
    hotelName: 'The Lagos Grand Hotel',
    roomId: '402',
    roomNumber: '402',
    stayId: ACTIVE_STAY_IDENTIFIER,
    guestName: 'Zainab Balogun',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
}

interface OrderFixtureOptions {
  identifier: string;
  stayIdentifier?: string;
  status?: OrderStatus;
  itemName?: string;
  totalMinor?: number;
  createdAt?: string;
  payment?: { method: string; paidAt: string } | null;
}

/** Builds an order as returned by the backend, including the optional `payment` record. */
export function createOrderFixture(fixtureOptions: OrderFixtureOptions): Order {
  const totalMinor: number = fixtureOptions.totalMinor ?? 5000;
  return {
    id: fixtureOptions.identifier,
    roomNumber: '402',
    stayId: fixtureOptions.stayIdentifier ?? ACTIVE_STAY_IDENTIFIER,
    hotelId: 'hotel_lagos_grand',
    status: fixtureOptions.status ?? 'DELIVERED',
    items: [
      {
        itemId: `item_${fixtureOptions.identifier}`,
        name: fixtureOptions.itemName ?? 'Jollof Rice',
        quantity: 1,
        unitPriceMinor: totalMinor,
        totalMinor,
      },
    ],
    subtotalMinor: totalMinor,
    taxMinor: 0,
    totalMinor,
    createdAt: fixtureOptions.createdAt ?? '2026-11-05T12:00:00.000Z',
    updatedAt: fixtureOptions.createdAt ?? '2026-11-05T12:00:00.000Z',
    ...(fixtureOptions.payment !== undefined ? { payment: fixtureOptions.payment } : {}),
  } as Order;
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

export function createQueryWrapper(queryClient: QueryClient) {
  return function QueryProviderWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}
