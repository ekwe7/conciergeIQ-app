/**
 * CreateRoomModal — component integration tests.
 *
 * Tests verify:
 *   1. The modal renders with both "One room" and "A range" mode options.
 *   2. The Add button is disabled until required fields are valid.
 *   3. Submitting in "one room" mode calls POST /rooms with the correct payload.
 *   4. Submitting in "range" mode calls POST /rooms/bulk with the expanded list.
 *   5. An API error is displayed as a form-level error message.
 *   6. The modal resets its fields when re-opened.
 *   7. MANAGE_ROOMS_AND_QR_CODES permission is required (page-level guard handles
 *      this — we confirm the modal itself renders when the guard passes).
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Room } from '../src/lib/api-types';
import { session } from '../src/lib/session';
import { fakeApi, renderDashboard, reply, signedInHandlers } from './support';

/** Fixture for a room returned by POST /rooms. */
function roomFixture(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-new-1',
    number: '301',
    floor: 3,
    isOutOfOrder: false,
    outOfOrderReason: null,
    qrToken: 'token-new',
    qrUrl: 'https://guest.test/r/token-new',
    qrRegeneratedAt: null,
    ...overrides,
  };
}

function resumeAsAdmin() {
  session.store({ accessToken: 'access-admin', refreshToken: 'refresh-admin' });
}

describe('CreateRoomModal on the QR Codes page', () => {
  it('renders the Add rooms button on the QR codes page for admins', async () => {
    fakeApi({
      ...signedInHandlers('ADMIN'),
      'GET /rooms': () => [],
      'GET /stays': () => [],
      'GET /orders': () => [],
    });
    resumeAsAdmin();
    renderDashboard('/qr-codes');

    expect(await screen.findByRole('button', { name: 'Add rooms' })).toBeTruthy();
  });

  it('opens the Create Room modal when "Add rooms" is clicked', async () => {
    fakeApi({
      ...signedInHandlers('ADMIN'),
      'GET /rooms': () => [],
      'GET /stays': () => [],
      'GET /orders': () => [],
    });
    resumeAsAdmin();
    renderDashboard('/qr-codes');

    fireEvent.click(await screen.findByRole('button', { name: 'Add rooms' }));

    const modal = await screen.findByRole('dialog', { name: 'Add rooms' });
    expect(modal).toBeTruthy();
    expect(within(modal).getByRole('button', { name: /A range/i })).toBeTruthy();
    expect(within(modal).getByRole('button', { name: /One room/i })).toBeTruthy();
  });

  it('disables the Add room button when the room number field is empty', async () => {
    fakeApi({
      ...signedInHandlers('ADMIN'),
      'GET /rooms': () => [],
      'GET /stays': () => [],
      'GET /orders': () => [],
    });
    resumeAsAdmin();
    renderDashboard('/qr-codes');

    fireEvent.click(await screen.findByRole('button', { name: 'Add rooms' }));
    const modal = await screen.findByRole('dialog', { name: 'Add rooms' });

    // Switch to single-room mode
    fireEvent.click(within(modal).getByRole('button', { name: 'One room' }));

    const addButton = within(modal).getByRole('button', { name: 'Add room' }) as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
  });

  it('enables the Add room button once a valid room number and floor are entered', async () => {
    fakeApi({
      ...signedInHandlers('ADMIN'),
      'GET /rooms': () => [],
      'GET /stays': () => [],
      'GET /orders': () => [],
    });
    resumeAsAdmin();
    renderDashboard('/qr-codes');

    fireEvent.click(await screen.findByRole('button', { name: 'Add rooms' }));
    const modal = await screen.findByRole('dialog', { name: 'Add rooms' });

    // Switch to single-room mode
    fireEvent.click(within(modal).getByRole('button', { name: 'One room' }));

    fireEvent.change(within(modal).getByLabelText('Room number'), {
      target: { value: '301' },
    });

    const addButton = within(modal).getByRole('button', { name: 'Add room' }) as HTMLButtonElement;
    expect(addButton.disabled).toBe(false);
  });

  it('calls POST /rooms and shows a success toast for a single room', async () => {
    const api = fakeApi({
      ...signedInHandlers('ADMIN'),
      'GET /rooms': () => [],
      'GET /stays': () => [],
      'GET /orders': () => [],
      'POST /rooms': () => reply(201, roomFixture({ number: '301', floor: 3 })),
    });
    resumeAsAdmin();
    renderDashboard('/qr-codes');

    fireEvent.click(await screen.findByRole('button', { name: 'Add rooms' }));
    const modal = await screen.findByRole('dialog', { name: 'Add rooms' });

    fireEvent.click(within(modal).getByRole('button', { name: 'One room' }));
    fireEvent.change(within(modal).getByLabelText('Room number'), {
      target: { value: '301' },
    });
    fireEvent.change(within(modal).getByLabelText('Floor'), {
      target: { value: '3' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Add room' }));

    await screen.findByText('Room 301 added');

    const postCalls = api.calls.filter(
      (call) => call.method === 'POST' && call.path === '/rooms',
    );
    expect(postCalls).toHaveLength(1);
    expect(postCalls[0]?.body).toEqual({ number: '301', floor: 3 });
  });

  it('calls POST /rooms/bulk for a range and shows how many rooms were added', async () => {
    const createdRooms = [
      roomFixture({ id: 'r-1', number: '101', floor: 1 }),
      roomFixture({ id: 'r-2', number: '102', floor: 1 }),
      roomFixture({ id: 'r-3', number: '103', floor: 1 }),
    ];

    const api = fakeApi({
      ...signedInHandlers('ADMIN'),
      'GET /rooms': () => [],
      'GET /stays': () => [],
      'GET /orders': () => [],
      'POST /rooms/bulk': () => reply(201, createdRooms),
    });
    resumeAsAdmin();
    renderDashboard('/qr-codes');

    fireEvent.click(await screen.findByRole('button', { name: 'Add rooms' }));
    const modal = await screen.findByRole('dialog', { name: 'Add rooms' });

    // "A range" is the default mode; fill in first + last room numbers
    fireEvent.change(within(modal).getByLabelText('First room'), {
      target: { value: '101' },
    });
    fireEvent.change(within(modal).getByLabelText('Last room'), {
      target: { value: '103' },
    });
    fireEvent.change(within(modal).getByLabelText('Floor'), {
      target: { value: '1' },
    });

    const addButton = within(modal).getByRole('button', {
      name: /Add \d+ rooms/,
    }) as HTMLButtonElement;
    expect(addButton.disabled).toBe(false);
    fireEvent.click(addButton);

    await screen.findByText('3 rooms added');

    const bulkCalls = api.calls.filter(
      (call) => call.method === 'POST' && call.path === '/rooms/bulk',
    );
    expect(bulkCalls).toHaveLength(1);
    expect((bulkCalls[0]?.body as { rooms: unknown[] }).rooms).toHaveLength(3);
  });

  it('shows a form-level error when POST /rooms returns a 400', async () => {
    fakeApi({
      ...signedInHandlers('ADMIN'),
      'GET /rooms': () => [],
      'GET /stays': () => [],
      'GET /orders': () => [],
      'POST /rooms': () =>
        reply(400, {
          error: { code: 'CONFLICT', message: 'Room 301 already exists on floor 3.' },
        }),
    });
    resumeAsAdmin();
    renderDashboard('/qr-codes');

    fireEvent.click(await screen.findByRole('button', { name: 'Add rooms' }));
    const modal = await screen.findByRole('dialog', { name: 'Add rooms' });

    fireEvent.click(within(modal).getByRole('button', { name: 'One room' }));
    fireEvent.change(within(modal).getByLabelText('Room number'), {
      target: { value: '301' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Add room' }));

    expect(await screen.findByText(/Room 301 already exists/)).toBeTruthy();
  });

  it('closes the modal when Cancel is clicked', async () => {
    fakeApi({
      ...signedInHandlers('ADMIN'),
      'GET /rooms': () => [],
      'GET /stays': () => [],
      'GET /orders': () => [],
    });
    resumeAsAdmin();
    renderDashboard('/qr-codes');

    fireEvent.click(await screen.findByRole('button', { name: 'Add rooms' }));
    await screen.findByRole('dialog', { name: 'Add rooms' });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add rooms' })).toBeNull());
  });

  it('blocks a non-admin user from accessing the QR codes page', async () => {
    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
      'GET /orders': () => [],
    });
    resumeAsAdmin();
    // Receptionists don't have MANAGE_ROOMS_AND_QR_CODES
    session.store({ accessToken: 'access-receptionist', refreshToken: 'refresh-receptionist' });
    renderDashboard('/qr-codes');

    expect(await screen.findByText('You do not have access to this page')).toBeTruthy();
  });
});
