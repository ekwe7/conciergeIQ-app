import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { QueryClient } from '@tanstack/react-query';
import { convertMajorToMinorUnits, useStayBill } from '../src/features/billing/hooks/useStayBill';
import { clearGuestSession } from '../src/features/guest-session/session-store';
import {
  ACTIVE_STAY_IDENTIFIER,
  GUEST_ORDERS_ENDPOINT_PATTERN,
  OTHER_STAY_IDENTIFIER,
  STAY_BILL_ENDPOINT_PATTERN,
  createOrderFixture,
  createQueryWrapper,
  createTestQueryClient,
  saveActiveGuestSession,
} from './fixtures/stay-fixtures';

const mockServer = setupServer();

beforeAll(() => mockServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  mockServer.resetHandlers();
  clearGuestSession();
});
afterAll(() => mockServer.close());

const paidBreakfastOrder = createOrderFixture({
  identifier: 'ord_paid_breakfast',
  itemName: 'Akara & Pap',
  totalMinor: 10000,
  createdAt: '2026-11-04T08:00:00.000Z',
  payment: { method: 'CARD', paidAt: '2026-11-04T09:00:00.000Z' },
});
const unpaidDinnerOrder = createOrderFixture({
  identifier: 'ord_unpaid_dinner',
  itemName: 'Suya Platter',
  totalMinor: 15050,
  createdAt: '2026-11-05T20:00:00.000Z',
  payment: null,
});
const cancelledOrder = createOrderFixture({
  identifier: 'ord_cancelled',
  status: 'CANCELLED',
  createdAt: '2026-11-05T21:00:00.000Z',
});
const otherStayOrder = createOrderFixture({
  identifier: 'ord_other_stay',
  stayIdentifier: OTHER_STAY_IDENTIFIER,
});

const backendBillResponse = {
  stayId: ACTIVE_STAY_IDENTIFIER,
  ordersCount: 2,
  totalCharged: 250.5,
  totalPaid: 100,
  outstanding: 150.5,
  openOrders: [],
};

describe('useStayBill', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    saveActiveGuestSession();
  });

  it('uses backend totals verbatim (converted from major to minor units)', async () => {
    mockServer.use(
      http.get(STAY_BILL_ENDPOINT_PATTERN, () => HttpResponse.json(backendBillResponse)),
      http.get(GUEST_ORDERS_ENDPOINT_PATTERN, () =>
        HttpResponse.json([paidBreakfastOrder, unpaidDinnerOrder])
      )
    );

    const { result } = renderHook(() => useStayBill(), { wrapper: createQueryWrapper(queryClient) });

    await waitFor(() => expect(result.current.bill).not.toBeNull());
    expect(result.current.bill).toMatchObject({
      stayIdentifier: ACTIVE_STAY_IDENTIFIER,
      totalChargedMinor: 25050,
      totalPaidMinor: 10000,
      outstandingBalanceMinor: 15050,
      ordersCount: 2,
      roomNumber: '402',
      areLineItemsAvailable: true,
    });
  });

  it('requests the bill for the active stay identifier', async () => {
    let requestedPath = '';
    mockServer.use(
      http.get(STAY_BILL_ENDPOINT_PATTERN, ({ request }) => {
        requestedPath = new URL(request.url).pathname;
        return HttpResponse.json(backendBillResponse);
      }),
      http.get(GUEST_ORDERS_ENDPOINT_PATTERN, () => HttpResponse.json([]))
    );

    const { result } = renderHook(() => useStayBill(), { wrapper: createQueryWrapper(queryClient) });

    await waitFor(() => expect(result.current.bill).not.toBeNull());
    expect(requestedPath).toBe(`/api/v1/stays/${ACTIVE_STAY_IDENTIFIER}/bill`);
  });

  it('itemizes stay orders with PAID / CHARGED_TO_ROOM_FOLIO status, excluding cancelled and foreign orders', async () => {
    mockServer.use(
      http.get(STAY_BILL_ENDPOINT_PATTERN, () => HttpResponse.json(backendBillResponse)),
      http.get(GUEST_ORDERS_ENDPOINT_PATTERN, () =>
        HttpResponse.json([paidBreakfastOrder, unpaidDinnerOrder, cancelledOrder, otherStayOrder])
      )
    );

    const { result } = renderHook(() => useStayBill(), { wrapper: createQueryWrapper(queryClient) });

    await waitFor(() => expect(result.current.bill).not.toBeNull());
    const lineItems = result.current.bill?.lineItems ?? [];
    expect(lineItems.map((lineItem) => [lineItem.orderIdentifier, lineItem.paymentStatus])).toEqual([
      ['ord_unpaid_dinner', 'CHARGED_TO_ROOM_FOLIO'],
      ['ord_paid_breakfast', 'PAID'],
    ]);
  });

  it('keeps backend totals and flags missing itemization when the orders request fails', async () => {
    mockServer.use(
      http.get(STAY_BILL_ENDPOINT_PATTERN, () => HttpResponse.json(backendBillResponse)),
      http.get(GUEST_ORDERS_ENDPOINT_PATTERN, () => HttpResponse.json({}, { status: 503 }))
    );

    const { result } = renderHook(() => useStayBill(), { wrapper: createQueryWrapper(queryClient) });

    await waitFor(() => expect(result.current.bill).not.toBeNull());
    expect(result.current.bill?.outstandingBalanceMinor).toBe(15050);
    expect(result.current.bill?.areLineItemsAvailable).toBe(false);
    expect(result.current.bill?.lineItems).toEqual([]);
  });

  it('surfaces an error instead of inventing totals when the bill endpoint fails', async () => {
    mockServer.use(
      http.get(STAY_BILL_ENDPOINT_PATTERN, () => HttpResponse.json({ message: 'Not Found' }, { status: 404 })),
      http.get(GUEST_ORDERS_ENDPOINT_PATTERN, () => HttpResponse.json([unpaidDinnerOrder]))
    );

    const { result } = renderHook(() => useStayBill(), { wrapper: createQueryWrapper(queryClient) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.bill).toBeNull();
  });

  it('rejects a bill that belongs to a different stay', async () => {
    mockServer.use(
      http.get(STAY_BILL_ENDPOINT_PATTERN, () =>
        HttpResponse.json({ ...backendBillResponse, stayId: OTHER_STAY_IDENTIFIER })
      ),
      http.get(GUEST_ORDERS_ENDPOINT_PATTERN, () => HttpResponse.json([]))
    );

    const { result } = renderHook(() => useStayBill(), { wrapper: createQueryWrapper(queryClient) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.bill).toBeNull();
  });

  it('does not query when there is no active guest session', async () => {
    clearGuestSession();
    const { result } = renderHook(() => useStayBill(), { wrapper: createQueryWrapper(queryClient) });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.hasActiveSession).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.bill).toBeNull();
  });
});

describe('convertMajorToMinorUnits', () => {
  it('converts whole and fractional major amounts without floating point drift', () => {
    expect(convertMajorToMinorUnits(150)).toBe(15000);
    expect(convertMajorToMinorUnits(150.5)).toBe(15050);
    expect(convertMajorToMinorUnits(0.29)).toBe(29);
    expect(convertMajorToMinorUnits(0)).toBe(0);
  });
});
