/**
 * CheckOutBillModal — Component and Integration Tests.
 *
 * Verifies:
 *   1. Renders consolidated room folio billing summaries (orders count, total charged, paid, outstanding).
 *   2. Displays prominent uncollected balance alert if an outstanding amount exists.
 *   3. Displays open orders warning banner with itemized active orders.
 *   4. Displays security boundary notice regarding session termination.
 *   5. Calls POST /api/v1/stays/:stayId/check-out on confirmation and shows toast notification.
 *   6. Handles error and retry states when the bill query fails.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../src/app/providers';
import { createQueryClient } from '../src/app/query-client';
import { CheckOutBillModal } from '../src/features/stays/components/CheckOutBillModal';
import type { Stay, StayBill } from '../src/lib/api-types';
import { session } from '../src/lib/session';
import { fakeApi, reply, signedInHandlers } from './support';

function createStayFixture(overrides: Partial<Stay> = {}): Stay {
  return {
    id: 'stay-207',
    roomId: 'room-207',
    roomNumber: '207',
    guestName: 'Mr. Lawal',
    guestPhone: '+234 802 334 5566',
    checkedInAt: '2026-11-02T14:30:00.000Z',
    expectedCheckOutAt: '2026-11-05T12:00:00.000Z',
    checkedOutAt: null,
    ...overrides,
  };
}

function createStayBillFixture(overrides: Partial<StayBill> = {}): StayBill {
  return {
    stayId: 'stay-207',
    ordersCount: 6,
    totalCharged: 64300,
    totalPaid: 52100,
    outstanding: 12200,
    openOrders: [
      {
        orderId: 'order-1044',
        orderNumber: 1044,
        status: 'IN_PROGRESS',
        itemsSummary: 'Pepper soup',
      },
    ],
    ...overrides,
  };
}

function renderCheckOutBillModal(
  properties: Partial<Parameters<typeof CheckOutBillModal>[0]> = {},
) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({
    queries: { retry: false, refetchInterval: false, refetchOnWindowFocus: false },
  });

  const defaultProperties = {
    isOpen: true,
    onClose: vi.fn(),
    stay: createStayFixture(),
    currency: 'NGN',
    timeZone: 'Africa/Lagos',
    onCheckOutSuccess: vi.fn(),
  };

  const combinedProperties = { ...defaultProperties, ...properties };

  const renderResult = render(
    <AppProviders queryClient={queryClient}>
      <CheckOutBillModal {...combinedProperties} />
    </AppProviders>,
  );

  return { ...renderResult, queryClient, properties: combinedProperties };
}

describe('CheckOutBillModal Component Suite', () => {
  beforeEach(() => {
    session.store({
      accessToken: 'access-token-receptionist',
      refreshToken: 'refresh-token-receptionist',
    });
  });

  it('renders loading state while folio bill query is pending', () => {
    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
      'GET /stays/stay-207/bill': () => new Promise(() => {}),
    });

    renderCheckOutBillModal();

    expect(
      screen.getByLabelText(/Loading consolidated folio bill/i),
    ).toBeTruthy();
  });

  it('renders consolidated room folio billing summary accurately', async () => {
    const mockStayBill = createStayBillFixture();

    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
      'GET /stays/stay-207/bill': () => mockStayBill,
    });

    renderCheckOutBillModal();

    expect(
      await screen.findByRole('heading', { name: /Check out · Room 207/i }),
    ).toBeTruthy();

    expect(await screen.findByText('Orders this stay')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();

    expect(screen.getByText('Total charged')).toBeTruthy();
    expect(screen.getByText('₦64,300')).toBeTruthy();

    expect(screen.getByText('Paid')).toBeTruthy();
    expect(screen.getByText('₦52,100')).toBeTruthy();

    expect(screen.getByText('Outstanding')).toBeTruthy();
    expect(screen.getByText('₦12,200')).toBeTruthy();
  });

  it('displays a prominent uncollected balance alert when outstanding > 0', async () => {
    const mockStayBill = createStayBillFixture({
      totalCharged: 80000,
      totalPaid: 65000,
      outstanding: 15000,
      openOrders: [],
    });

    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
      'GET /stays/stay-207/bill': () => mockStayBill,
    });

    renderCheckOutBillModal();

    const uncollectedBalanceAlert = await screen.findByRole('alert', {
      name: /Uncollected balance warning/i,
    });
    expect(uncollectedBalanceAlert).toBeTruthy();
    expect(uncollectedBalanceAlert.textContent).toContain('₦15,000 unpaid');
    expect(uncollectedBalanceAlert.textContent).toContain(
      'Collect the outstanding dining charges from the guest before confirming check-out',
    );
  });

  it('displays open orders warning banner when orders remain open', async () => {
    const mockStayBill = createStayBillFixture({
      openOrders: [
        {
          orderId: 'order-1044',
          orderNumber: 1044,
          status: 'IN_PROGRESS',
          itemsSummary: 'Pepper soup',
        },
        {
          orderId: 'order-1045',
          orderNumber: 1045,
          status: 'PENDING',
          itemsSummary: 'Club sandwich',
        },
      ],
    });

    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
      'GET /stays/stay-207/bill': () => mockStayBill,
    });

    renderCheckOutBillModal();

    expect(
      await screen.findByText(/2 orders still open/i),
    ).toBeTruthy();
    expect(screen.getByText(/Pepper soup/i)).toBeTruthy();
    expect(screen.getByText(/Club sandwich/i)).toBeTruthy();
    expect(screen.getByText('A-1044')).toBeTruthy();
    expect(screen.getByText('A-1045')).toBeTruthy();
  });

  it('displays security boundary notice regarding session termination', async () => {
    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
      'GET /stays/stay-207/bill': () => createStayBillFixture(),
    });

    renderCheckOutBillModal();

    expect(
      await screen.findByText(
        /All guest sessions for Room 207 end immediately upon check-out/i,
      ),
    ).toBeTruthy();
  });

  it('displays "Collect [amount] first" and "Check out anyway" buttons when balance is unpaid', async () => {
    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
      'GET /stays/stay-207/bill': () => createStayBillFixture({ outstanding: 12200 }),
    });

    renderCheckOutBillModal();

    expect(
      await screen.findByRole('button', { name: /Collect ₦12,200 first/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Check out anyway/i }),
    ).toBeTruthy();
  });

  it('displays "Cancel" and "Confirm check out" buttons when folio is fully settled', async () => {
    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
      'GET /stays/stay-207/bill': () =>
        createStayBillFixture({
          totalCharged: 50000,
          totalPaid: 50000,
          outstanding: 0,
          openOrders: [],
        }),
    });

    renderCheckOutBillModal();

    expect(
      await screen.findByRole('button', { name: /Confirm check out/i }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(
      screen.queryByRole('alert', { name: /Uncollected balance warning/i }),
    ).toBeNull();
  });

  it('calls POST /stays/:stayId/check-out and invokes success callback on confirmation', async () => {
    const mockStay = createStayFixture();
    let capturedCheckOutMethod: string | null = null;
    let capturedCheckOutPath: string | null = null;

    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
      'GET /stays/stay-207/bill': () =>
        createStayBillFixture({
          outstanding: 0,
          openOrders: [],
        }),
      'POST /stays/stay-207/check-out': () => {
        capturedCheckOutMethod = 'POST';
        capturedCheckOutPath = '/stays/stay-207/check-out';
        return reply(200, { ...mockStay, checkedOutAt: new Date().toISOString() });
      },
      'GET /stays': () => [],
      'GET /rooms': () => [],
      'GET /orders': () => [],
    });

    const onCheckOutSuccessSpy = vi.fn();
    const onCloseSpy = vi.fn();

    renderCheckOutBillModal({
      stay: mockStay,
      onCheckOutSuccess: onCheckOutSuccessSpy,
      onClose: onCloseSpy,
    });

    await screen.findByText('Orders this stay');

    const confirmButton = screen.getByRole('button', {
      name: /Confirm check out/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(capturedCheckOutMethod).toBe('POST');
      expect(capturedCheckOutPath).toBe('/stays/stay-207/check-out');
      expect(onCheckOutSuccessSpy).toHaveBeenCalledTimes(1);
      expect(onCloseSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('surfaces error message and retry when bill fetch fails', async () => {
    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
      'GET /stays/stay-207/bill': () =>
        reply(500, { error: { message: 'Database connection failed' } }),
    });

    renderCheckOutBillModal();

    expect(
      await screen.findByText(/Something went wrong on our side\. Try again\./i),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Try again/i }),
    ).toBeTruthy();
  });
});
