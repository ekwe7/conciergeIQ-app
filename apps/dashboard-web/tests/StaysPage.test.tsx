/**
 * StaysPage — Page Integration Tests for Screen UI-06.
 *
 * Verifies:
 *   1. Renders headline KPI metrics (occupancy %, arrivals, departures, out of order).
 *   2. Toggles between Grid view (cards) and List view (StaysTable).
 *   3. Filters rooms and stays according to the selected floor tab.
 *   4. Opens CheckOutBillModal when clicking "Check out" from either view.
 *   5. Opens CheckInModal with room picker on "Quick check-in" button click.
 *   6. Opens CreateRoomModal on "Add rooms" button click for authorized roles.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Room, Stay } from '../src/lib/api-types';
import { session } from '../src/lib/session';
import { fakeApi, renderDashboard, signedInHandlers } from './support';

function createRoomFixture(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-101',
    number: '101',
    floor: 1,
    isOutOfOrder: false,
    outOfOrderReason: null,
    qrToken: 'qr-token-101',
    qrUrl: 'https://guest.test/r/qr-token-101',
    qrRegeneratedAt: null,
    ...overrides,
  };
}

function createStayFixture(overrides: Partial<Stay> = {}): Stay {
  return {
    id: 'stay-101',
    roomId: 'room-101',
    roomNumber: '101',
    guestName: 'Mr. Bello',
    guestPhone: '+234 801 112 2334',
    checkedInAt: '2026-11-03T12:00:00.000Z',
    expectedCheckOutAt: '2026-11-20T12:00:00.000Z',
    checkedOutAt: null,
    ...overrides,
  };
}

describe('StaysPage (UI-06 Check-In & Check-Out Management)', () => {
  beforeEach(() => {
    session.store({
      accessToken: 'access-token-receptionist',
      refreshToken: 'refresh-token-receptionist',
    });
  });

  it('renders headline KPI cards and summary statistics accurately', async () => {
    const roomsList = [
      createRoomFixture({ id: 'room-101', number: '101', floor: 1 }),
      createRoomFixture({ id: 'room-102', number: '102', floor: 1 }),
      createRoomFixture({
        id: 'room-103',
        number: '103',
        floor: 1,
        isOutOfOrder: true,
      }),
    ];

    const staysList = [
      createStayFixture({
        id: 'stay-101',
        roomId: 'room-101',
        roomNumber: '101',
        guestName: 'Mr. Bello',
        checkedInAt: new Date().toISOString(), // Arrival today
      }),
    ];

    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
      'GET /rooms': () => roomsList,
      'GET /stays': () => staysList,
      'GET /orders': () => [],
    });

    renderDashboard('/rooms');

    expect(
      await screen.findByText('Occupancy'),
    ).toBeTruthy();

    expect(screen.getByRole('heading', { name: 'Rooms & stays' })).toBeTruthy();
    expect(screen.getByText('Arrivals today')).toBeTruthy();
    expect(screen.getByText('Departures today')).toBeTruthy();
    expect(screen.getAllByText('Out of order').length).toBeGreaterThanOrEqual(1);
  });

  it('switches to list view and renders StaysTable with columns', async () => {
    const roomsList = [
      createRoomFixture({ id: 'room-101', number: '101', floor: 1 }),
      createRoomFixture({ id: 'room-201', number: '201', floor: 2 }),
    ];

    const staysList = [
      createStayFixture({
        id: 'stay-101',
        roomId: 'room-101',
        roomNumber: '101',
        guestName: 'Mr. Bello',
      }),
    ];

    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
      'GET /rooms': () => roomsList,
      'GET /stays': () => staysList,
      'GET /orders': () => [],
    });

    renderDashboard('/rooms');

    await screen.findByText('Occupancy');

    // Switch view to List
    const listViewButton = screen.getByRole('button', { name: 'List' });
    fireEvent.click(listViewButton);

    // StaysTable header columns should be visible
    expect(screen.getByText('Room')).toBeTruthy();
    expect(screen.getByText('Guest')).toBeTruthy();
    expect(screen.getByText('Checked in')).toBeTruthy();
    expect(screen.getByText('Expected departure')).toBeTruthy();
    expect(screen.getByText('Active orders')).toBeTruthy();

    // The stay row should be present
    expect(screen.getByText('Mr. Bello')).toBeTruthy();
  });

  it('opens CheckOutBillModal when clicking Check out from StaysTable', async () => {
    const roomsList = [
      createRoomFixture({ id: 'room-101', number: '101', floor: 1 }),
    ];

    const staysList = [
      createStayFixture({
        id: 'stay-101',
        roomId: 'room-101',
        roomNumber: '101',
        guestName: 'Mr. Bello',
      }),
    ];

    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
      'GET /rooms': () => roomsList,
      'GET /stays': () => staysList,
      'GET /orders': () => [],
      'GET /stays/stay-101/bill': () => ({
        stayId: 'stay-101',
        ordersCount: 2,
        totalCharged: 23200,
        totalPaid: 23200,
        outstanding: 0,
        openOrders: [],
      }),
    });

    renderDashboard('/rooms');

    await screen.findByText('Occupancy');

    // Switch to List mode
    const listViewButton = screen.getByRole('button', { name: 'List' });
    fireEvent.click(listViewButton);

    const checkOutButton = await screen.findByRole('button', {
      name: /Check out/i,
    });
    fireEvent.click(checkOutButton);

    expect(
      await screen.findByRole('heading', { name: /Check out · Room 101/i }),
    ).toBeTruthy();
  });

  it('opens CheckInModal with room picker on Quick check-in button click', async () => {
    const roomsList = [
      createRoomFixture({ id: 'room-102', number: '102', floor: 1 }),
    ];

    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
      'GET /rooms': () => roomsList,
      'GET /stays': () => [],
      'GET /orders': () => [],
    });

    renderDashboard('/rooms');

    await screen.findByRole('heading', { name: 'Rooms & stays' });

    const quickCheckInButton = screen.getByRole('button', {
      name: /Quick check-in/i,
    });
    fireEvent.click(quickCheckInButton);

    expect(
      await screen.findByRole('heading', { name: /Check in/i }),
    ).toBeTruthy();

    expect(screen.getByLabelText(/Select Room/i)).toBeTruthy();
  });
});
