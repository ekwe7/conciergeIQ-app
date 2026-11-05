import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { session } from '../src/lib/session';
import { FakeSocket, HOTEL, fakeApi, order, renderDashboard, reply, signedInHandlers, staffUser } from './support';

/** Starts the app with a session it can resume, as after a page reload. */
function resumeSession() {
  session.store({ accessToken: 'expired', refreshToken: 'refresh-1' });
}

describe('signing in', () => {
  it('signs in and lands on the live orders board', async () => {
    const api = fakeApi({
      'POST /auth/login': ({ body }) =>
        (body as { password: string }).password === 'ChangeMe123!'
          ? { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 900, user: staffUser() }
          : reply(401, { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } }),
      'GET /hotel': () => HOTEL,
      'GET /orders': () => [order()],
      'GET /payments/outstanding': () => [],
    });

    renderDashboard('/orders');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'amaka@azurebay.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect((await screen.findByRole('alert')).textContent).toContain('do not match an active account');

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'ChangeMe123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Live orders' })).toBeTruthy();
    expect(await screen.findByRole('article', { name: 'Room 214, order A-1047' })).toBeTruthy();
    expect(api.calls.find((call) => call.path === '/orders')?.authorization).toBe('Bearer access-1');
    expect(session.getRefreshToken()).toBe('refresh-1');
  });

  it('resumes the session after a reload and connects to live updates', async () => {
    fakeApi({ ...signedInHandlers(), 'GET /orders': () => [] });
    resumeSession();
    renderDashboard('/orders');

    expect(await screen.findByRole('heading', { name: 'Live orders' })).toBeTruthy();
    await waitFor(() => expect(FakeSocket.instances.length).toBe(1));
    expect(FakeSocket.latest().url).toContain('accessToken=access-1');
    expect(await screen.findByText('Live')).toBeTruthy();
  });
});

describe('live orders', () => {
  it('accepts an order and moves it to In progress', async () => {
    let current = order();
    const api = fakeApi({
      ...signedInHandlers(),
      'GET /orders': () => [current],
      'PATCH /orders/order-1/status': ({ body }) => {
        current = { ...current, status: (body as { status: 'IN_PROGRESS' }).status };
        return current;
      },
    });
    resumeSession();
    renderDashboard('/orders');

    const card = await screen.findByRole('article', { name: 'Room 214, order A-1047' });
    expect(within(screen.getByRole('region', { name: 'Pending' })).getByRole('article')).toBe(card);

    fireEvent.click(within(card).getByRole('button', { name: 'Accept' }));

    await waitFor(() =>
      expect(within(screen.getByRole('region', { name: 'In progress' })).queryByRole('article', { name: /Room 214/ })).toBeTruthy(),
    );
    expect(api.calls.find((call) => call.method === 'PATCH')?.body).toEqual({ status: 'IN_PROGRESS' });
    expect(await screen.findByText('Order A-1047 accepted')).toBeTruthy();
  });

  it('requires a reason to cancel', async () => {
    const api = fakeApi({
      ...signedInHandlers(),
      'GET /orders': () => [order()],
      'PATCH /orders/order-1/status': ({ body }) => ({ ...order(), status: 'CANCELLED', cancelReason: (body as { reason: string }).reason }),
    });
    resumeSession();
    renderDashboard('/orders');

    fireEvent.click(within(await screen.findByRole('article', { name: /Room 214/ })).getByRole('button', { name: 'Cancel' }));
    const dialog = await screen.findByRole('dialog', { name: 'Cancel order A-1047' });
    const confirm = within(dialog).getByRole('button', { name: 'Cancel order' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Guest changed their mind' }));
    fireEvent.click(confirm);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(api.calls.find((call) => call.method === 'PATCH')?.body).toEqual({ status: 'CANCELLED', reason: 'Guest changed their mind' });
  });

  it('opens the order drawer with items, notes and timeline', async () => {
    fakeApi({ ...signedInHandlers(), 'GET /orders': () => [order()], 'GET /orders/order-1': () => order() });
    resumeSession();
    renderDashboard('/orders?order=order-1');

    const drawer = await screen.findByRole('dialog', { name: /Order A-1047/ });
    expect(within(drawer).getByText('Azure club burger')).toBeTruthy();
    expect(within(drawer).getByText('Note: No ice')).toBeTruthy();
    expect(within(drawer).getByText('Placed by guest')).toBeTruthy();
    expect(within(drawer).getByText('Waiting to be accepted')).toBeTruthy();
    expect(within(drawer).getByRole('button', { name: 'Accept' })).toBeTruthy();
  });

  it('shows a new order pushed over the WebSocket', async () => {
    let orders = [order()];
    fakeApi({ ...signedInHandlers(), 'GET /orders': () => orders });
    resumeSession();
    renderDashboard('/orders');
    await screen.findByRole('article', { name: /Room 214/ });
    await waitFor(() => expect(FakeSocket.instances.length).toBe(1));

    orders = [...orders, order({ id: 'order-2', number: 1048, roomNumber: '407', roomId: 'room-407', stayId: 'stay-407' })];
    act(() =>
      FakeSocket.latest().push({
        type: 'NEW_ORDER_RECEIVED',
        payload: { orderId: 'order-2', orderNumber: 1048, roomNumber: '407', totalAmount: 9100, itemsSummary: 'Egusi and pounded yam', createdAt: new Date().toISOString() },
      }),
    );

    expect(await screen.findByText('New order from Room 407')).toBeTruthy();
    expect(await screen.findByRole('article', { name: 'Room 407, order A-1048' })).toBeTruthy();
  });
});

describe('roles', () => {
  it('hides front-desk pages and payment actions from kitchen staff', async () => {
    fakeApi({
      ...signedInHandlers('STAFF'),
      'GET /orders': () => [order({ status: 'DELIVERED' })],
    });
    resumeSession();
    renderDashboard('/orders');

    const nav = await screen.findByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: /Live orders/ })).toBeTruthy();
    expect(within(nav).queryByRole('link', { name: /Payments/ })).toBeNull();
    expect(within(nav).queryByRole('link', { name: /Rooms & stays/ })).toBeNull();
    const card = await screen.findByRole('article', { name: /Room 214/ });
    expect(within(card).getByText('Unpaid')).toBeTruthy();
    expect(within(card).queryByRole('button', { name: 'Record payment' })).toBeNull();
  });

  it('shows a clear message on a page the role cannot use', async () => {
    fakeApi({ ...signedInHandlers('RECEPTIONIST'), 'GET /orders': () => [] });
    resumeSession();
    renderDashboard('/staff');
    expect(await screen.findByText('You do not have access to this page')).toBeTruthy();
  });

  it('signs out when the account is deactivated', async () => {
    fakeApi({ ...signedInHandlers(), 'GET /orders': () => [], 'POST /auth/logout': () => reply(204) });
    resumeSession();
    renderDashboard('/orders');
    await screen.findByRole('heading', { name: 'Live orders' });
    await waitFor(() => expect(FakeSocket.instances.length).toBe(1));

    act(() => FakeSocket.latest().push({ type: 'SESSION_REVOKED', payload: { reason: 'deactivated' } }));

    expect(await screen.findByText(/Your account was deactivated/)).toBeTruthy();
    expect(session.getRefreshToken()).toBeNull();
  });
});

describe('session renewal', () => {
  it('renews an expired access token once and retries the request', async () => {
    let refreshes = 0;
    const api = fakeApi({
      'POST /auth/refresh': () => {
        refreshes += 1;
        return { accessToken: `access-${refreshes}`, refreshToken: `refresh-${refreshes + 1}`, expiresIn: 900, user: staffUser() };
      },
      'GET /hotel': () => HOTEL,
      'GET /payments/outstanding': () => [],
      'GET /orders': () => [],
      'GET /menu': () => {
        const call = api.calls[api.calls.length - 1];
        return call.authorization === 'Bearer access-1'
          ? reply(401, { error: { code: 'UNAUTHORIZED', message: 'Sign in to continue' } })
          : { categories: [{ id: 'c1', name: 'Mains', sortOrder: 0, items: [] }] };
      },
    });
    resumeSession();
    renderDashboard('/menu');

    expect(await screen.findByRole('heading', { name: 'Mains' })).toBeTruthy();
    expect(refreshes).toBe(2);
    expect(session.getRefreshToken()).toBe('refresh-3');
  });
});
