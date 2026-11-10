import { StaffRole } from '@conciergeiq/contracts';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  OrderBoardColumn,
  OrderCard,
  formatElapsedMinutesBadge,
  getOrderElapsedUrgency,
} from '../src/features/orders/components';
import { OrderStatus } from '../src/lib/api-types';
import { session } from '../src/lib/session';
import { fakeApi, order, renderDashboard, signedInHandlers } from './support';

describe('OrderCard component and elapsed timer urgency', () => {
  const fixedNowMs = Date.parse('2026-11-09T14:30:00.000Z');

  it('renders Room Number, Order Number, Item Summary, Total Amount, and Elapsed Time', () => {
    const threeMinutesAgoIso = new Date(fixedNowMs - 3 * 60_000).toISOString();
    const sampleOrder = order({
      id: 'order-card-1',
      number: 1047,
      roomNumber: '214',
      status: OrderStatus.PENDING,
      totalAmount: 23200,
      createdAt: threeMinutesAgoIso,
      updatedAt: threeMinutesAgoIso,
    });

    render(
      <OrderCard
        order={sampleOrder}
        now={fixedNowMs}
        currency="NGN"
      />,
    );

    expect(screen.getByText(/Room 214/)).toBeTruthy();
    expect(screen.getByText('A-1047')).toBeTruthy();
    expect(screen.getByText('Azure club burger ×2 · Chapman')).toBeTruthy();
    expect(screen.getByText('₦23,200')).toBeTruthy();

    const elapsedBadge = screen.getByTestId('order-elapsed-order-card-1');
    expect(elapsedBadge.textContent).toBe('3m ago');
    expect(elapsedBadge.getAttribute('data-urgency')).toBe('normal');
  });

  it('transitions elapsed badge urgency to amber at 10m and red at 20m for active orders', () => {
    const fiveMinutesAgoIso = new Date(fixedNowMs - 5 * 60_000).toISOString();
    const tenMinutesAgoIso = new Date(fixedNowMs - 10 * 60_000).toISOString();
    const twentyMinutesAgoIso = new Date(fixedNowMs - 20 * 60_000).toISOString();

    expect(getOrderElapsedUrgency(OrderStatus.PENDING, fiveMinutesAgoIso, fixedNowMs)).toBe('normal');
    expect(getOrderElapsedUrgency(OrderStatus.PENDING, tenMinutesAgoIso, fixedNowMs)).toBe('amber');
    expect(getOrderElapsedUrgency(OrderStatus.IN_PROGRESS, twentyMinutesAgoIso, fixedNowMs)).toBe('red');
    expect(getOrderElapsedUrgency(OrderStatus.DELIVERED, twentyMinutesAgoIso, fixedNowMs)).toBe('normal');

    expect(formatElapsedMinutesBadge(tenMinutesAgoIso, fixedNowMs)).toBe('10m ago');
    expect(formatElapsedMinutesBadge(twentyMinutesAgoIso, fixedNowMs)).toBe('20m ago');
  });

  it('updates the elapsed time badge dynamically every minute without a page reload', () => {
    vi.useFakeTimers();
    try {
      const startTimeMs = Date.parse('2026-11-09T14:00:00.000Z');
      vi.setSystemTime(startTimeMs);

      const twoMinutesAgoIso = new Date(startTimeMs - 2 * 60_000).toISOString();
      const dynamicOrder = order({
        id: 'order-dynamic-timer',
        number: 1088,
        roomNumber: '302',
        status: OrderStatus.PENDING,
        createdAt: twoMinutesAgoIso,
        updatedAt: twoMinutesAgoIso,
      });

      render(<OrderCard order={dynamicOrder} />);

      const elapsedBadge = screen.getByTestId('order-elapsed-order-dynamic-timer');
      expect(elapsedBadge.textContent).toBe('2m ago');
      expect(elapsedBadge.getAttribute('data-urgency')).toBe('normal');

      // Advance 8 minutes -> total 10 minutes elapsed (amber threshold)
      act(() => {
        vi.advanceTimersByTime(8 * 60_000);
      });
      expect(elapsedBadge.textContent).toBe('10m ago');
      expect(elapsedBadge.getAttribute('data-urgency')).toBe('amber');

      // Advance 10 more minutes -> total 20 minutes elapsed (red threshold)
      act(() => {
        vi.advanceTimersByTime(10 * 60_000);
      });
      expect(elapsedBadge.textContent).toBe('20m ago');
      expect(elapsedBadge.getAttribute('data-urgency')).toBe('red');
    } finally {
      vi.useRealTimers();
    }
  });

  it('invokes onSelectOrder with the clicked order ID when the card is clicked', () => {
    const handleSelectOrder = vi.fn();
    const clickableOrder = order({
      id: 'order-select-42',
      number: 1042,
      roomNumber: '101',
    });

    render(
      <OrderCard
        order={clickableOrder}
        now={fixedNowMs}
        onSelectOrder={handleSelectOrder}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Open Room 101, order A-1042/i }));
    expect(handleSelectOrder).toHaveBeenCalledTimes(1);
    expect(handleSelectOrder).toHaveBeenCalledWith('order-select-42');
  });
});

describe('OrderBoardColumn component', () => {
  const fixedNowMs = Date.parse('2026-11-09T14:30:00.000Z');

  it('renders column count badge (e.g. "New Orders (3)") and individual scrollable container', () => {
    const pendingOrders = [
      order({ id: 'p-1', number: 1001, roomNumber: '101', status: OrderStatus.PENDING }),
      order({ id: 'p-2', number: 1002, roomNumber: '102', status: OrderStatus.PENDING }),
      order({ id: 'p-3', number: 1003, roomNumber: '103', status: OrderStatus.PENDING }),
    ];

    render(
      <OrderBoardColumn
        status={OrderStatus.PENDING}
        orders={pendingOrders}
        now={fixedNowMs}
      />,
    );

    const countBadge = screen.getByTestId('column-count-badge-PENDING');
    expect(countBadge.textContent).toBe('New Orders (3)');

    const scrollContainer = screen.getByTestId('column-scroll-container-PENDING');
    expect(scrollContainer.className).toContain('overflow-y-auto');
  });

  it('supports collapsible styling on DELIVERED and CANCELLED columns', () => {
    const deliveredOrders = [
      order({ id: 'd-1', number: 1010, roomNumber: '205', status: OrderStatus.DELIVERED }),
    ];

    render(
      <OrderBoardColumn
        status={OrderStatus.DELIVERED}
        orders={deliveredOrders}
        now={fixedNowMs}
      />,
    );

    const columnSection = screen.getByTestId('order-column-DELIVERED');
    expect(columnSection.getAttribute('data-collapsed')).toBe('false');
    expect(screen.getByRole('article', { name: 'Room 205, order A-1010' })).toBeTruthy();

    const collapseButton = screen.getByRole('button', { name: 'Collapse Delivered column' });
    fireEvent.click(collapseButton);

    expect(columnSection.getAttribute('data-collapsed')).toBe('true');
    expect(screen.queryByRole('article', { name: 'Room 205, order A-1010' })).toBeNull();
    expect(screen.getByText('1 order hidden')).toBeTruthy();

    const expandButton = screen.getByRole('button', { name: 'Expand Delivered column' });
    fireEvent.click(expandButton);

    expect(columnSection.getAttribute('data-collapsed')).toBe('false');
    expect(screen.getByRole('article', { name: 'Room 205, order A-1010' })).toBeTruthy();
  });

  it('forwards card selection callbacks from cards inside the column', () => {
    const handleSelectOrder = vi.fn();
    const inProgressOrders = [
      order({ id: 'ip-99', number: 1099, roomNumber: '412', status: OrderStatus.IN_PROGRESS }),
    ];

    render(
      <OrderBoardColumn
        status={OrderStatus.IN_PROGRESS}
        orders={inProgressOrders}
        now={fixedNowMs}
        onSelectOrder={handleSelectOrder}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Open Room 412, order A-1099/i }));
    expect(handleSelectOrder).toHaveBeenCalledWith('ip-99');
  });
});

describe('OrdersPage Kanban board integration', () => {
  it('groups fetched orders into their respective status columns and opens the drawer on card click', async () => {
    const boardOrders = [
      order({ id: 'ord-pending', number: 1051, roomNumber: '101', status: OrderStatus.PENDING }),
      order({ id: 'ord-progress', number: 1052, roomNumber: '202', status: OrderStatus.IN_PROGRESS }),
      order({ id: 'ord-delivered', number: 1053, roomNumber: '303', status: OrderStatus.DELIVERED }),
      order({ id: 'ord-cancelled', number: 1054, roomNumber: '404', status: OrderStatus.CANCELLED, cancelReason: 'Duplicate order' }),
    ];

    fakeApi({
      ...signedInHandlers(StaffRole.RECEPTIONIST),
      'GET /orders': () => boardOrders,
      'GET /orders/ord-pending': () => boardOrders[0],
    });
    session.store({ accessToken: 'expired', refreshToken: 'refresh-1' });

    renderDashboard('/orders');

    expect(await screen.findByRole('heading', { name: 'Live orders' })).toBeTruthy();

    const pendingRegion = screen.getByRole('region', { name: 'Pending' });
    const inProgressRegion = screen.getByRole('region', { name: 'In progress' });
    const deliveredRegion = screen.getByRole('region', { name: 'Delivered' });
    const cancelledRegion = screen.getByRole('region', { name: 'Cancelled' });

    expect(within(pendingRegion).getByRole('article', { name: 'Room 101, order A-1051' })).toBeTruthy();
    expect(within(inProgressRegion).getByRole('article', { name: 'Room 202, order A-1052' })).toBeTruthy();
    expect(within(deliveredRegion).getByRole('article', { name: 'Room 303, order A-1053' })).toBeTruthy();
    expect(within(cancelledRegion).getByRole('article', { name: 'Room 404, order A-1054' })).toBeTruthy();

    fireEvent.click(within(pendingRegion).getByRole('button', { name: /Open Room 101, order A-1051/i }));
    expect(await screen.findByRole('dialog', { name: /Order A-1051/i })).toBeTruthy();
  });
});
