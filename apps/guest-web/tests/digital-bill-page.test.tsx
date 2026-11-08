import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DigitalBillPage } from '../src/pages/DigitalBillPage';
import { clearGuestSession } from '../src/features/guest-session/session-store';
import {
  ACTIVE_STAY_IDENTIFIER,
  GUEST_ORDERS_ENDPOINT_PATTERN,
  STAY_BILL_ENDPOINT_PATTERN,
  createOrderFixture,
  createTestQueryClient,
  saveActiveGuestSession,
} from './fixtures/stay-fixtures';

const mockServer = setupServer();

beforeAll(() => mockServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  mockServer.resetHandlers();
  clearGuestSession();
  vi.restoreAllMocks();
});
afterAll(() => mockServer.close());

function renderDigitalBillPage() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/bill']}>
        <DigitalBillPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const paidOrder = createOrderFixture({
  identifier: 'ord_paid_breakfast',
  itemName: 'Akara & Pap',
  totalMinor: 10000,
  createdAt: '2026-11-04T08:00:00.000Z',
  payment: { method: 'CARD', paidAt: '2026-11-04T09:00:00.000Z' },
});
const unpaidOrder = createOrderFixture({
  identifier: 'ord_unpaid_dinner',
  itemName: 'Suya Platter',
  totalMinor: 15000,
  createdAt: '2026-11-05T20:00:00.000Z',
  payment: null,
});

describe('DigitalBillPage', () => {
  beforeEach(() => saveActiveGuestSession());

  it('shows unpaid balance state with backend totals and per-order settlement badges', async () => {
    mockServer.use(
      http.get(STAY_BILL_ENDPOINT_PATTERN, () =>
        HttpResponse.json({
          stayId: ACTIVE_STAY_IDENTIFIER,
          ordersCount: 2,
          totalCharged: 250,
          totalPaid: 100,
          outstanding: 150,
          openOrders: [],
        })
      ),
      http.get(GUEST_ORDERS_ENDPOINT_PATTERN, () => HttpResponse.json([paidOrder, unpaidOrder]))
    );

    renderDigitalBillPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Digital Folio Bill' })).toBeInTheDocument();
    expect(screen.getByText('Balance due')).toBeInTheDocument();
    expect(screen.getByText(/Payable at the front desk before check-out/i)).toBeInTheDocument();

    expect(screen.getByTestId('folio-total-billed')).toHaveTextContent('$250.00');
    expect(screen.getByTestId('folio-total-paid')).toHaveTextContent('$100.00');
    expect(screen.getByTestId('folio-net-balance')).toHaveTextContent('$150.00');
    expect(screen.getByTestId('folio-outstanding-balance')).toHaveTextContent('$150.00');

    const chargesList = screen.getByRole('list', { name: 'Itemized folio charges' });
    expect(within(chargesList).getAllByRole('listitem')).toHaveLength(2);
    expect(within(screen.getByTestId('folio-line-ord_paid_breakfast')).getByText('Paid')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('folio-line-ord_unpaid_dinner')).getByText('Charged to room folio')
    ).toBeInTheDocument();
  });

  it('shows zero-balance state when the folio is fully settled', async () => {
    mockServer.use(
      http.get(STAY_BILL_ENDPOINT_PATTERN, () =>
        HttpResponse.json({
          stayId: ACTIVE_STAY_IDENTIFIER,
          ordersCount: 1,
          totalCharged: 100,
          totalPaid: 100,
          outstanding: 0,
          openOrders: [],
        })
      ),
      http.get(GUEST_ORDERS_ENDPOINT_PATTERN, () => HttpResponse.json([paidOrder]))
    );

    renderDigitalBillPage();

    expect(await screen.findByText('Paid in full')).toBeInTheDocument();
    expect(screen.getByTestId('folio-outstanding-balance')).toHaveTextContent('$0.00');
    expect(screen.getByTestId('folio-net-balance')).toHaveTextContent('$0.00');
    expect(screen.getByTestId('folio-total-paid')).toHaveTextContent('$100.00');
    expect(screen.getByText(/Your folio is fully settled/i)).toBeInTheDocument();
    expect(screen.queryByText('Balance due')).not.toBeInTheDocument();
  });

  it('shows an empty-charges message when no orders have been placed', async () => {
    mockServer.use(
      http.get(STAY_BILL_ENDPOINT_PATTERN, () =>
        HttpResponse.json({
          stayId: ACTIVE_STAY_IDENTIFIER,
          ordersCount: 0,
          totalCharged: 0,
          totalPaid: 0,
          outstanding: 0,
          openOrders: [],
        })
      ),
      http.get(GUEST_ORDERS_ENDPOINT_PATTERN, () => HttpResponse.json([]))
    );

    renderDigitalBillPage();

    expect(await screen.findByText('No charges recorded for this stay yet.')).toBeInTheDocument();
  });

  it('shows an error with retry when the bill cannot be loaded', async () => {
    let billRequestCount = 0;
    mockServer.use(
      http.get(STAY_BILL_ENDPOINT_PATTERN, () => {
        billRequestCount += 1;
        return HttpResponse.json({ message: 'Server error' }, { status: 500 });
      }),
      http.get(GUEST_ORDERS_ENDPOINT_PATTERN, () => HttpResponse.json([]))
    );

    renderDigitalBillPage();

    expect(await screen.findByRole('heading', { name: 'Could Not Load Folio Bill' })).toBeInTheDocument();
    expect(screen.queryByTestId('folio-outstanding-balance')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    await vi.waitFor(() => expect(billRequestCount).toBe(2));
  });

  it('opens the browser print dialog for print / PDF download', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    mockServer.use(
      http.get(STAY_BILL_ENDPOINT_PATTERN, () =>
        HttpResponse.json({
          stayId: ACTIVE_STAY_IDENTIFIER,
          ordersCount: 0,
          totalCharged: 0,
          totalPaid: 0,
          outstanding: 0,
        })
      ),
      http.get(GUEST_ORDERS_ENDPOINT_PATTERN, () => HttpResponse.json([]))
    );

    renderDigitalBillPage();

    fireEvent.click(await screen.findByRole('button', { name: /Print \/ Download PDF/i }));
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it('asks the guest to scan their room QR code when there is no active stay', () => {
    clearGuestSession();
    renderDigitalBillPage();
    expect(screen.getByRole('heading', { name: 'No Active Stay' })).toBeInTheDocument();
  });
});
