import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { OrderHistoryPage } from '../src/pages/OrderHistoryPage';
import { clearGuestSession } from '../src/features/guest-session/session-store';
import {
  GUEST_ORDERS_ENDPOINT_PATTERN,
  OTHER_STAY_IDENTIFIER,
  createOrderFixture,
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

function renderOrderHistoryPage() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/orders']}>
        <OrderHistoryPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('OrderHistoryPage', () => {
  beforeEach(() => saveActiveGuestSession());

  it('lists only active-stay orders, newest first, with status and settlement labels', async () => {
    mockServer.use(
      http.get(GUEST_ORDERS_ENDPOINT_PATTERN, () =>
        HttpResponse.json([
          createOrderFixture({
            identifier: 'ord_breakfast',
            createdAt: '2026-11-04T08:00:00.000Z',
            payment: { method: 'CASH', paidAt: '2026-11-04T09:00:00.000Z' },
          }),
          createOrderFixture({
            identifier: 'ord_dinner',
            status: 'IN_PROGRESS',
            createdAt: '2026-11-05T19:00:00.000Z',
          }),
          createOrderFixture({ identifier: 'ord_cancelled', status: 'CANCELLED', createdAt: '2026-11-05T10:00:00.000Z' }),
          createOrderFixture({ identifier: 'ord_foreign', stayIdentifier: OTHER_STAY_IDENTIFIER }),
        ])
      )
    );

    renderOrderHistoryPage();

    const ordersList = await screen.findByRole('list', { name: 'Orders placed during this stay' });
    const orderLinks = within(ordersList).getAllByRole('link');
    expect(orderLinks.map((orderLink) => orderLink.getAttribute('href'))).toEqual([
      '/orders/ord_dinner',
      '/orders/ord_cancelled',
      '/orders/ord_breakfast',
    ]);
    expect(screen.queryByTestId('order-history-card-ord_foreign')).not.toBeInTheDocument();
    expect(screen.getByText('3 orders')).toBeInTheDocument();

    const dinnerCard = screen.getByTestId('order-history-card-ord_dinner');
    expect(within(dinnerCard).getByText('In the kitchen')).toBeInTheDocument();
    expect(within(dinnerCard).getByText('Charged to room folio')).toBeInTheDocument();

    expect(within(screen.getByTestId('order-history-card-ord_breakfast')).getByText('Paid')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('order-history-card-ord_cancelled')).getByText('Not charged')
    ).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /View folio bill/i })).toHaveAttribute('href', '/bill');
  });

  it('shows the empty state with a link to the menu when no orders exist', async () => {
    mockServer.use(http.get(GUEST_ORDERS_ENDPOINT_PATTERN, () => HttpResponse.json([])));

    renderOrderHistoryPage();

    expect(await screen.findByRole('heading', { name: 'No Orders Placed Yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Browse In-Room Dining Menu/i })).toHaveAttribute('href', '/menu');
  });

  it('shows an error state with retry when orders fail to load', async () => {
    mockServer.use(
      http.get(GUEST_ORDERS_ENDPOINT_PATTERN, () => HttpResponse.json({}, { status: 500 }))
    );

    renderOrderHistoryPage();

    expect(await screen.findByRole('heading', { name: 'Could Not Load Orders' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });
});
