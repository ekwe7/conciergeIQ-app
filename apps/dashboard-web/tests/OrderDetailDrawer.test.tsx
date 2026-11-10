import { StaffRole } from '@conciergeiq/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  CancelOrderModal,
  OrderDetailDrawer,
} from '../src/features/orders/components';
import { OrderStatus, type Order } from '../src/lib/api-types';
import { session } from '../src/lib/session';
import { fakeApi, order, renderDashboard, signedInHandlers } from './support';

function renderWithIsolatedQueryClient(componentElement: React.ReactElement) {
  const isolatedQueryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return {
    queryClient: isolatedQueryClient,
    ...render(
      <QueryClientProvider client={isolatedQueryClient}>
        {componentElement}
      </QueryClientProvider>,
    ),
  };
}

describe('OrderDetailDrawer component', () => {
  it('renders itemized receipt with quantities, unit prices, highlighted preparation notes, room number, and close button', async () => {
    const detailedOrder = order({
      id: 'order-drawer-101',
      number: 1042,
      roomNumber: '101',
      status: OrderStatus.IN_PROGRESS,
      items: [
        {
          itemId: 'item-jollof',
          name: 'Jollof rice & grilled chicken',
          quantity: 1,
          unitPrice: 8500,
          notes: 'Less pepper, extra plantain',
        },
        {
          itemId: 'item-burger',
          name: 'Azure club burger',
          quantity: 2,
          unitPrice: 9200,
          notes: 'No onions',
        },
        {
          itemId: 'item-chapman',
          name: 'Chapman',
          quantity: 2,
          unitPrice: 2400,
        },
      ],
      totalAmount: 31700,
    });

    fakeApi({
      'GET /orders/order-drawer-101': () => detailedOrder,
    });

    const handleCloseDrawer = vi.fn();

    renderWithIsolatedQueryClient(
      <OrderDetailDrawer
        orderId="order-drawer-101"
        hotelId="hotel-1"
        currency="NGN"
        onClose={handleCloseDrawer}
      />,
    );

    const drawerDialog = await screen.findByRole('dialog', {
      name: /Order A-1042/i,
    });
    expect(
      within(drawerDialog).getByText(/Room 101 · placed/i),
    ).toBeTruthy();

    // Item names and quantities
    expect(
      within(drawerDialog).getByText('Jollof rice & grilled chicken'),
    ).toBeTruthy();
    expect(within(drawerDialog).getByText('Azure club burger')).toBeTruthy();
    expect(within(drawerDialog).getByText('Chapman')).toBeTruthy();
    expect(within(drawerDialog).getByText('1×')).toBeTruthy();
    expect(within(drawerDialog).getAllByText('2×')).toHaveLength(2);

    // Unit prices and line totals
    expect(within(drawerDialog).getByText('₦8,500')).toBeTruthy();
    expect(within(drawerDialog).getByText('₦9,200 each')).toBeTruthy();
    expect(within(drawerDialog).getByText('₦18,400')).toBeTruthy();
    expect(within(drawerDialog).getByText('₦2,400 each')).toBeTruthy();
    expect(within(drawerDialog).getByText('₦4,800')).toBeTruthy();
    expect(
      within(drawerDialog).getByTestId('order-receipt-total').textContent,
    ).toBe('₦31,700');

    // Highlighted preparation notes
    const jollofPreparationNote = within(drawerDialog).getByTestId(
      'order-item-note-item-jollof',
    );
    expect(jollofPreparationNote.textContent).toContain(
      'Less pepper, extra plantain',
    );
    expect(jollofPreparationNote.className).toContain('bg-notice');

    const burgerPreparationNote = within(drawerDialog).getByTestId(
      'order-item-note-item-burger',
    );
    expect(burgerPreparationNote.textContent).toContain('No onions');

    // Clicking the close button triggers onClose
    fireEvent.click(within(drawerDialog).getByRole('button', { name: 'Close' }));
    expect(handleCloseDrawer).toHaveBeenCalledTimes(1);
  });

  describe('action button visibility per status', () => {
    it('shows "Accept Order" and "Reject Order" when order status is PENDING', async () => {
      const pendingOrder = order({
        id: 'order-status-pending',
        number: 1050,
        roomNumber: '201',
        status: OrderStatus.PENDING,
      });

      fakeApi({
        'GET /orders/order-status-pending': () => pendingOrder,
      });

      renderWithIsolatedQueryClient(
        <OrderDetailDrawer
          orderId="order-status-pending"
          hotelId="hotel-1"
          onClose={() => undefined}
        />,
      );

      const drawerDialog = await screen.findByRole('dialog', {
        name: /Order A-1050/i,
      });

      expect(
        within(drawerDialog).getByRole('button', { name: 'Accept Order' }),
      ).toBeTruthy();
      expect(
        within(drawerDialog).getByRole('button', { name: 'Reject Order' }),
      ).toBeTruthy();
      expect(
        within(drawerDialog).queryByRole('button', { name: 'Mark Delivered' }),
      ).toBeNull();
      expect(
        within(drawerDialog).queryByRole('button', { name: 'Cancel Order' }),
      ).toBeNull();
    });

    it('shows "Mark Delivered" and "Cancel Order" when order status is IN_PROGRESS', async () => {
      const inProgressOrder = order({
        id: 'order-status-progress',
        number: 1051,
        roomNumber: '202',
        status: OrderStatus.IN_PROGRESS,
      });

      fakeApi({
        'GET /orders/order-status-progress': () => inProgressOrder,
      });

      renderWithIsolatedQueryClient(
        <OrderDetailDrawer
          orderId="order-status-progress"
          hotelId="hotel-1"
          onClose={() => undefined}
        />,
      );

      const drawerDialog = await screen.findByRole('dialog', {
        name: /Order A-1051/i,
      });

      expect(
        within(drawerDialog).getByRole('button', { name: 'Mark Delivered' }),
      ).toBeTruthy();
      expect(
        within(drawerDialog).getByRole('button', { name: 'Cancel Order' }),
      ).toBeTruthy();
      expect(
        within(drawerDialog).queryByRole('button', { name: 'Accept Order' }),
      ).toBeNull();
      expect(
        within(drawerDialog).queryByRole('button', { name: 'Reject Order' }),
      ).toBeNull();
    });

    it('disables status transition actions when order status is DELIVERED (terminal state)', async () => {
      const deliveredOrder = order({
        id: 'order-status-delivered',
        number: 1052,
        roomNumber: '203',
        status: OrderStatus.DELIVERED,
      });

      fakeApi({
        'GET /orders/order-status-delivered': () => deliveredOrder,
      });

      renderWithIsolatedQueryClient(
        <OrderDetailDrawer
          orderId="order-status-delivered"
          hotelId="hotel-1"
          onClose={() => undefined}
        />,
      );

      const drawerDialog = await screen.findByRole('dialog', {
        name: /Order A-1052/i,
      });

      expect(
        within(drawerDialog).queryByRole('button', { name: 'Accept Order' }),
      ).toBeNull();
      expect(
        within(drawerDialog).queryByRole('button', { name: 'Reject Order' }),
      ).toBeNull();
      expect(
        within(drawerDialog).queryByRole('button', { name: 'Mark Delivered' }),
      ).toBeNull();
      expect(
        within(drawerDialog).queryByRole('button', { name: 'Cancel Order' }),
      ).toBeNull();
      expect(
        within(drawerDialog).getByTestId('order-terminal-state').textContent,
      ).toContain('Actions disabled');
    });

    it('disables status transition actions and shows cancellation reason when order status is CANCELLED (terminal state)', async () => {
      const cancelledOrder = order({
        id: 'order-status-cancelled',
        number: 1053,
        roomNumber: '204',
        status: OrderStatus.CANCELLED,
        cancelReason: 'Kitchen closed',
      });

      fakeApi({
        'GET /orders/order-status-cancelled': () => cancelledOrder,
      });

      renderWithIsolatedQueryClient(
        <OrderDetailDrawer
          orderId="order-status-cancelled"
          hotelId="hotel-1"
          onClose={() => undefined}
        />,
      );

      const drawerDialog = await screen.findByRole('dialog', {
        name: /Order A-1053/i,
      });

      expect(
        within(drawerDialog).queryByRole('button', { name: 'Accept Order' }),
      ).toBeNull();
      expect(
        within(drawerDialog).queryByRole('button', { name: 'Reject Order' }),
      ).toBeNull();
      expect(
        within(drawerDialog).queryByRole('button', { name: 'Mark Delivered' }),
      ).toBeNull();
      expect(
        within(drawerDialog).queryByRole('button', { name: 'Cancel Order' }),
      ).toBeNull();
      expect(within(drawerDialog).getByText('Kitchen closed')).toBeTruthy();
      expect(
        within(drawerDialog).getByTestId('order-terminal-state').textContent,
      ).toContain('Actions disabled');
    });
  });
});

describe('CancelOrderModal component', () => {
  it('blocks submitting an empty cancellation reason and validates with UpdateOrderStatusSchema', async () => {
    const targetOrder = order({
      id: 'order-modal-1',
      number: 1080,
      roomNumber: '305',
      status: OrderStatus.PENDING,
    });

    const mockedApi = fakeApi({
      'PATCH /orders/order-modal-1/status': ({ body }) => ({
        ...targetOrder,
        status: OrderStatus.CANCELLED,
        cancelReason: (body as { reason: string }).reason,
      }),
    });

    const handleCloseModal = vi.fn();

    renderWithIsolatedQueryClient(
      <CancelOrderModal
        order={targetOrder}
        hotelId="hotel-1"
        onClose={handleCloseModal}
      />,
    );

    const modalDialog = await screen.findByRole('dialog', {
      name: /Cancel order A-1080/i,
    });
    const confirmCancelButton = within(modalDialog).getByRole('button', {
      name: 'Cancel order',
    }) as HTMLButtonElement;

    // Submit button is initially disabled when reason is empty
    expect(confirmCancelButton.disabled).toBe(true);

    // Attempting to submit the form directly with an empty/whitespace reason is blocked
    const cancelForm = within(modalDialog).getByTestId('cancel-order-form');
    fireEvent.submit(cancelForm);
    expect(
      await within(modalDialog).findByText(/cancellation reason is required/i),
    ).toBeTruthy();
    expect(mockedApi.calls).toHaveLength(0);

    // Entering a valid reason enables submission and dispatches PATCH /orders/:orderId/status
    const reasonTextarea = within(modalDialog).getByLabelText('Reason');
    fireEvent.change(reasonTextarea, {
      target: { value: 'Item not available in kitchen' },
    });
    expect(confirmCancelButton.disabled).toBe(false);

    fireEvent.click(confirmCancelButton);

    await waitFor(() => {
      expect(handleCloseModal).toHaveBeenCalledTimes(1);
    });
    expect(mockedApi.calls[0]?.body).toEqual({
      status: OrderStatus.CANCELLED,
      reason: 'Item not available in kitchen',
    });
  });
});

describe('Live Orders Board + OrderDetailDrawer lifecycle integration', () => {
  it('opens drawer on card click, advances PENDING -> IN_PROGRESS -> DELIVERED, and moves the card across columns', async () => {
    let serverOrderRecord: Order = order({
      id: 'order-lifecycle-1',
      number: 1090,
      roomNumber: '410',
      status: OrderStatus.PENDING,
    });

    const mockedApi = fakeApi({
      ...signedInHandlers(StaffRole.RECEPTIONIST),
      'GET /orders': () => [serverOrderRecord],
      'GET /orders/order-lifecycle-1': () => serverOrderRecord,
      'PATCH /orders/order-lifecycle-1/status': ({ body }) => {
        const updatePayload = body as { status: OrderStatus; reason?: string };
        serverOrderRecord = {
          ...serverOrderRecord,
          status: updatePayload.status,
          cancelReason: updatePayload.reason ?? null,
          updatedAt: new Date().toISOString(),
        };
        return serverOrderRecord;
      },
    });
    session.store({ accessToken: 'expired', refreshToken: 'refresh-1' });

    renderDashboard('/orders');

    const pendingColumn = await screen.findByRole('region', { name: 'Pending' });
    const inProgressColumn = screen.getByRole('region', { name: 'In progress' });
    const deliveredColumn = screen.getByRole('region', { name: 'Delivered' });

    // Card starts in Pending column
    const cardButton = within(pendingColumn).getByRole('button', {
      name: /Open Room 410, order A-1090/i,
    });
    fireEvent.click(cardButton);

    // Drawer opens with PENDING actions
    const drawerDialog = await screen.findByRole('dialog', {
      name: /Order A-1090/i,
    });
    expect(within(drawerDialog).getByText(/Room 410/)).toBeTruthy();

    const acceptOrderButton = within(drawerDialog).getByRole('button', {
      name: 'Accept Order',
    });
    fireEvent.click(acceptOrderButton);

    // Card moves to In progress column on the live board
    await waitFor(() => {
      expect(
        within(inProgressColumn).queryByRole('article', {
          name: 'Room 410, order A-1090',
        }),
      ).toBeTruthy();
    });

    // Drawer now displays IN_PROGRESS actions ("Mark Delivered" and "Cancel Order")
    const markDeliveredButton = await within(drawerDialog).findByRole('button', {
      name: 'Mark Delivered',
    });
    fireEvent.click(markDeliveredButton);

    // Card moves to Delivered column on the live board
    await waitFor(() => {
      expect(
        within(deliveredColumn).queryByRole('article', {
          name: 'Room 410, order A-1090',
        }),
      ).toBeTruthy();
    });

    const patchCalls = mockedApi.calls.filter(
      (recordedCall) => recordedCall.method === 'PATCH',
    );
    expect(patchCalls.map((recordedCall) => recordedCall.body)).toEqual([
      { status: OrderStatus.IN_PROGRESS },
      { status: OrderStatus.DELIVERED },
    ]);
  });

  it('rejects a PENDING order from the drawer via CancelOrderModal and moves the card to Cancelled', async () => {
    let serverOrderRecord: Order = order({
      id: 'order-reject-1',
      number: 1095,
      roomNumber: '512',
      status: OrderStatus.PENDING,
    });

    const mockedApi = fakeApi({
      ...signedInHandlers(StaffRole.RECEPTIONIST),
      'GET /orders': () => [serverOrderRecord],
      'GET /orders/order-reject-1': () => serverOrderRecord,
      'PATCH /orders/order-reject-1/status': ({ body }) => {
        const updatePayload = body as { status: OrderStatus; reason: string };
        serverOrderRecord = {
          ...serverOrderRecord,
          status: updatePayload.status,
          cancelReason: updatePayload.reason,
          updatedAt: new Date().toISOString(),
        };
        return serverOrderRecord;
      },
    });
    session.store({ accessToken: 'expired', refreshToken: 'refresh-1' });

    renderDashboard('/orders');

    const pendingColumn = await screen.findByRole('region', { name: 'Pending' });
    const cancelledColumn = screen.getByRole('region', { name: 'Cancelled' });

    fireEvent.click(
      within(pendingColumn).getByRole('button', {
        name: /Open Room 512, order A-1095/i,
      }),
    );

    const drawerDialog = await screen.findByRole('dialog', {
      name: /Order A-1095/i,
    });
    fireEvent.click(
      within(drawerDialog).getByRole('button', { name: 'Reject Order' }),
    );

    const cancelDialog = await screen.findByRole('dialog', {
      name: /Cancel order A-1095/i,
    });
    fireEvent.click(
      within(cancelDialog).getByRole('button', { name: 'Duplicate order' }),
    );
    fireEvent.click(
      within(cancelDialog).getByRole('button', { name: 'Cancel order' }),
    );

    await waitFor(() => {
      expect(
        within(cancelledColumn).queryByRole('article', {
          name: 'Room 512, order A-1095',
        }),
      ).toBeTruthy();
    });

    const patchCall = mockedApi.calls.find(
      (recordedCall) => recordedCall.method === 'PATCH',
    );
    expect(patchCall?.body).toEqual({
      status: OrderStatus.CANCELLED,
      reason: 'Duplicate order',
    });
  });
});
