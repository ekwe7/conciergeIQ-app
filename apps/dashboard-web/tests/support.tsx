import { render } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AppProviders } from '../src/app/providers';
import { createQueryClient } from '../src/app/query-client';
import { routes } from '../src/app/routes';
import type { Hotel, Order, StaffRole, StaffUser } from '../src/lib/api-types';

export const HOTEL: Hotel = {
  id: 'hotel-1',
  name: 'Azure Bay Hotel',
  address: 'Victoria Island, Lagos',
  timezone: 'Africa/Lagos',
  currency: 'NGN',
};

export function staffUser(role: StaffRole = 'RECEPTIONIST'): StaffUser {
  return {
    id: 'user-1',
    hotelId: HOTEL.id,
    email: 'amaka@azurebay.test',
    fullName: 'Amaka Obi',
    role,
    isActive: true,
    lastSignedInAt: null,
  };
}

export function order(overrides: Partial<Order> = {}): Order {
  const createdAt = overrides.createdAt ?? new Date(Date.now() - 60_000).toISOString();
  return {
    id: 'order-1',
    number: 1047,
    roomId: 'room-214',
    roomNumber: '214',
    stayId: 'stay-214',
    status: 'PENDING',
    items: [
      { itemId: 'item-1', name: 'Azure club burger', quantity: 2, unitPrice: 9200 },
      { itemId: 'item-2', name: 'Chapman', quantity: 1, unitPrice: 4800, notes: 'No ice' },
    ],
    totalAmount: 23200,
    cancelReason: null,
    payment: null,
    history: [{ from: null, to: 'PENDING', changedBy: 'guest', changedAt: createdAt }],
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

const REPLY = Symbol('reply');

/** A non-200 answer from a fake handler; anything else a handler returns is sent as a 200 JSON body. */
export function reply(status: number, body?: unknown) {
  return { [REPLY]: true, status, body };
}

type Handler = (request: { body: unknown; url: URL }) => unknown;

/**
 * A fake API: register `METHOD /path` handlers; any other request fails the
 * test with a 404 so missing stubs are obvious. Records every call.
 */
export function fakeApi(handlers: Record<string, Handler>) {
  const calls: { method: string; path: string; body: unknown; authorization: string | null }[] = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://dashboard.test');
    const method = (init.method ?? 'GET').toUpperCase();
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    const headers = new Headers(init.headers);
    calls.push({ method, path, body, authorization: headers.get('Authorization') });

    const handler = handlers[`${method} ${path}`];
    if (!handler) {
      return json(404, { error: { code: 'NOT_FOUND', message: `No stub for ${method} ${path}` } });
    }
    const result = handler({ body, url });
    if (result && typeof result === 'object' && REPLY in result) {
      const { status, body: responseBody } = result as { status: number; body?: unknown };
      return status === 204 ? new Response(null, { status }) : json(status, responseBody);
    }
    return json(200, result);
  });

  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body ?? null), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Stands in for the browser WebSocket so tests can push server messages. */
export class FakeSocket {
  static instances: FakeSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  closed = false;

  constructor(public url: string) {
    FakeSocket.instances.push(this);
    setTimeout(() => this.onopen?.(), 0);
  }

  close() {
    this.closed = true;
  }

  push(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }

  static latest(): FakeSocket {
    const socket = FakeSocket.instances[FakeSocket.instances.length - 1];
    if (!socket) throw new Error('No socket opened');
    return socket;
  }
}

export function renderDashboard(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retry: false, refetchInterval: false, refetchOnWindowFocus: false },
  });
  return { router, ...render(<AppProviders queryClient={queryClient}><RouterProvider router={router} future={{ v7_startTransition: true }} /></AppProviders>) };
}

/** Logs in through the UI-independent path: a stored refresh token the app resumes on load. */
export function signedInHandlers(role: StaffRole = 'RECEPTIONIST'): Record<string, Handler> {
  return {
    'POST /auth/refresh': () => ({ accessToken: 'access-1', refreshToken: 'refresh-2', expiresIn: 900, user: staffUser(role) }),
    'GET /hotel': () => HOTEL,
    'GET /payments/outstanding': () => [],
  };
}
