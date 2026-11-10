/**
 * CheckInModal — Component and Integration Tests.
 *
 * Verifies:
 *   1. Renders title and fields with a preselected room.
 *   2. Renders room picker dropdown in Quick Check-In mode without a preselected room.
 *   3. Enforces validation on required guest name and future departure date.
 *   4. Submits payload to POST /api/v1/rooms/:roomId/check-in and invokes success callbacks.
 *   5. Displays form-level error messages when check-in fails.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../src/app/providers';
import { createQueryClient } from '../src/app/query-client';
import { CheckInModal } from '../src/features/stays/components/CheckInModal';
import type { Room, Stay } from '../src/lib/api-types';
import { session } from '../src/lib/session';
import { fakeApi, reply, signedInHandlers } from './support';

function createRoomFixture(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-102',
    number: '102',
    floor: 1,
    isOutOfOrder: false,
    outOfOrderReason: null,
    qrToken: 'qr-token-102',
    qrUrl: 'https://guest.test/r/qr-token-102',
    qrRegeneratedAt: null,
    ...overrides,
  };
}

function renderCheckInModal(
  properties: Partial<Parameters<typeof CheckInModal>[0]> = {},
) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({
    queries: { retry: false, refetchInterval: false, refetchOnWindowFocus: false },
  });

  const defaultProperties = {
    isOpen: true,
    onClose: vi.fn(),
    preselectedRoom: createRoomFixture(),
    availableRooms: [createRoomFixture()],
    onCheckInSuccess: vi.fn(),
  };

  const combinedProperties = { ...defaultProperties, ...properties };

  const renderResult = render(
    <AppProviders queryClient={queryClient}>
      <CheckInModal {...combinedProperties} />
    </AppProviders>,
  );

  return { ...renderResult, queryClient, properties: combinedProperties };
}

describe('CheckInModal Component Suite', () => {
  beforeEach(() => {
    session.store({
      accessToken: 'access-token-receptionist',
      refreshToken: 'refresh-token-receptionist',
    });
  });

  it('renders modal with preselected room title and QR code activation callout', () => {
    const mockRoom = createRoomFixture({ number: '102' });

    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
    });

    renderCheckInModal({ preselectedRoom: mockRoom });

    expect(
      screen.getByRole('heading', { name: /Check in · Room 102/i }),
    ).toBeTruthy();
    expect(
      screen.getByText(/Starts a stay and activates the room's QR code/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/Room 102's QR code becomes active as soon as you confirm/i),
    ).toBeTruthy();
  });

  it('renders room picker selection dropdown in quick check-in mode without preselected room', () => {
    const availableRoomsList = [
      createRoomFixture({ id: 'room-102', number: '102', floor: 1 }),
      createRoomFixture({ id: 'room-205', number: '205', floor: 2 }),
    ];

    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
    });

    renderCheckInModal({
      preselectedRoom: null,
      availableRooms: availableRoomsList,
    });

    expect(
      screen.getByRole('heading', { name: /Check in · Room 102/i }),
    ).toBeTruthy();
    const roomSelectElement = screen.getByLabelText(/Select Room/i);
    expect(roomSelectElement).toBeTruthy();
    expect(screen.getByText('Room 102 (Floor 1)')).toBeTruthy();
    expect(screen.getByText('Room 205 (Floor 2)')).toBeTruthy();
  });

  it('disables the check-in button when guest full name is empty', () => {
    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
    });

    renderCheckInModal();

    const submitButton = screen.getByRole('button', { name: /^Check in$/i }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);

    const guestNameInput = screen.getByLabelText(/Guest name/i);
    fireEvent.change(guestNameInput, { target: { value: 'Mrs. Funke Adebayo' } });

    expect(submitButton.disabled).toBe(false);
  });

  it('displays validation error when expected departure date is set in the past', () => {
    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
    });

    renderCheckInModal();

    const guestNameInput = screen.getByLabelText(/Guest name/i);
    fireEvent.change(guestNameInput, { target: { value: 'Mrs. Funke Adebayo' } });

    const departureDateInput = screen.getByLabelText(/Expected departure/i);
    fireEvent.change(departureDateInput, { target: { value: '2020-01-01T12:00' } });

    expect(
      screen.getByText(/Departure must be in the future/i),
    ).toBeTruthy();

    const submitButton = screen.getByRole('button', { name: /^Check in$/i }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
  });

  it('submits valid check-in data to POST /rooms/:roomId/check-in', async () => {
    const targetRoom = createRoomFixture({ id: 'room-102', number: '102' });
    let capturedRequestBody: unknown = null;
    let capturedRequestPath: string | null = null;

    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
      'POST /rooms/room-102/check-in': ({ body }) => {
        capturedRequestBody = body;
        capturedRequestPath = '/rooms/room-102/check-in';
        const createdStayResult: Stay = {
          id: 'stay-102',
          roomId: targetRoom.id,
          roomNumber: targetRoom.number,
          guestName: 'Mrs. Funke Adebayo',
          guestPhone: '+234 801 234 5678',
          checkedInAt: new Date().toISOString(),
          expectedCheckOutAt: '2026-11-20T12:00:00.000Z',
          checkedOutAt: null,
        };
        return reply(201, createdStayResult);
      },
      'GET /stays': () => [],
      'GET /rooms': () => [],
      'GET /orders': () => [],
    });

    const onCheckInSuccessSpy = vi.fn();
    const onCloseSpy = vi.fn();

    renderCheckInModal({
      preselectedRoom: targetRoom,
      onCheckInSuccess: onCheckInSuccessSpy,
      onClose: onCloseSpy,
    });

    const guestNameInput = screen.getByLabelText(/Guest name/i);
    fireEvent.change(guestNameInput, { target: { value: 'Mrs. Funke Adebayo' } });

    const guestPhoneInput = screen.getByLabelText(/Phone/i);
    fireEvent.change(guestPhoneInput, { target: { value: '+234 801 234 5678' } });

    const submitButton = screen.getByRole('button', { name: /^Check in$/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(capturedRequestPath).toBe('/rooms/room-102/check-in');
      expect(capturedRequestBody).toEqual(
        expect.objectContaining({
          guestName: 'Mrs. Funke Adebayo',
          guestPhone: '+234 801 234 5678',
        }),
      );
      expect(onCheckInSuccessSpy).toHaveBeenCalledTimes(1);
      expect(onCloseSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('displays form error when check-in mutation returns an API error', async () => {
    const targetRoom = createRoomFixture({ id: 'room-102' });

    fakeApi({
      ...signedInHandlers('RECEPTIONIST'),
      'POST /rooms/room-102/check-in': () =>
        reply(400, { error: { message: 'Room is already occupied by an active stay.' } }),
    });

    renderCheckInModal({ preselectedRoom: targetRoom });

    const guestNameInput = screen.getByLabelText(/Guest name/i);
    fireEvent.change(guestNameInput, { target: { value: 'Mrs. Funke Adebayo' } });

    const submitButton = screen.getByRole('button', { name: /^Check in$/i });
    fireEvent.click(submitButton);

    expect(
      await screen.findByText(/Room is already occupied by an active stay/i),
    ).toBeTruthy();
  });
});
