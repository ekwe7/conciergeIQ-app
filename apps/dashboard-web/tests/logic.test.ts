import { describe, expect, it } from 'vitest';
import { averageAcceptMilliseconds, canBePaid } from '../src/features/orders/api';
import { periodStart } from '../src/features/payments/api';
import { formatAge, formatAmount, formatCharge, formatOrderNumber, formatWaiting, summarizeItems } from '../src/lib/format';
import { canManageRole, roleCan, Permission } from '../src/lib/permissions';
import { parseMessage } from '../src/lib/websocket-client';
import { expandRoomNumbers } from '../src/pages/QrCodesPage';
import { occupancyOf } from '../src/pages/RoomsPage';
import { order } from './support';

describe('formatting', () => {
  it('formats API amounts (major units) in the hotel currency', () => {
    expect(formatAmount(23200, 'NGN')).toBe('₦23,200');
    expect(formatAmount(4500.5, 'NGN')).toBe('₦4,500.50');
    expect(formatCharge(0, 'NGN')).toBe('Free');
  });

  it('formats order numbers, ages and waiting clocks', () => {
    const now = Date.parse('2026-11-05T19:40:00Z');
    expect(formatOrderNumber(1042)).toBe('A-1042');
    expect(formatAge('2026-11-05T19:39:30Z', now)).toBe('just now');
    expect(formatAge('2026-11-05T19:32:00Z', now)).toBe('8 min');
    expect(formatAge('2026-11-05T18:10:00Z', now)).toBe('1 h');
    expect(formatWaiting('2026-11-05T19:37:19Z', now)).toBe('2:41');
  });

  it('summarises order lines', () => {
    expect(summarizeItems([{ name: 'Burger', quantity: 2 }, { name: 'Chapman', quantity: 1 }])).toBe('Burger ×2 · Chapman');
  });
});

describe('permissions mirror the API', () => {
  it('stacks roles', () => {
    expect(roleCan('STAFF', Permission.VIEW_AND_UPDATE_ORDERS)).toBe(true);
    expect(roleCan('STAFF', Permission.RECORD_PAYMENTS)).toBe(false);
    expect(roleCan('RECEPTIONIST', Permission.CHECK_GUESTS_IN_AND_OUT)).toBe(true);
    expect(roleCan('MANAGER', Permission.MANAGE_ROOMS_AND_QR_CODES)).toBe(false);
    expect(roleCan('ADMIN', Permission.MANAGE_HOTEL_SETTINGS)).toBe(true);
  });

  it('lets managers manage only roles below them', () => {
    expect(canManageRole('MANAGER', 'RECEPTIONIST')).toBe(true);
    expect(canManageRole('MANAGER', 'MANAGER')).toBe(false);
    expect(canManageRole('RECEPTIONIST', 'STAFF')).toBe(false);
    expect(canManageRole('ADMIN', 'ADMIN')).toBe(true);
  });
});

describe('orders', () => {
  it('only offers payment where the API accepts one', () => {
    expect(canBePaid(order({ status: 'PENDING' }))).toBe(false);
    expect(canBePaid(order({ status: 'IN_PROGRESS' }))).toBe(true);
    expect(canBePaid(order({ status: 'DELIVERED' }))).toBe(true);
    expect(canBePaid(order({ status: 'DELIVERED', totalAmount: 0 }))).toBe(false);
    expect(canBePaid(order({ status: 'DELIVERED', payment: { method: 'CARD', paidAt: '2026-11-05T19:00:00Z' } }))).toBe(false);
    expect(canBePaid(order({ status: 'CANCELLED' }))).toBe(false);
  });

  it('averages time to accept over accepted orders only', () => {
    const accepted = order({
      createdAt: '2026-11-05T19:00:00Z',
      history: [
        { from: null, to: 'PENDING', changedBy: 'guest', changedAt: '2026-11-05T19:00:00Z' },
        { from: 'PENDING', to: 'IN_PROGRESS', changedBy: 'Chidi', changedAt: '2026-11-05T19:02:00Z' },
      ],
    });
    expect(averageAcceptMilliseconds([accepted, order()])).toBe(120_000);
    expect(averageAcceptMilliseconds([order()])).toBeNull();
  });
});

describe('rooms', () => {
  const room = { id: 'r', number: '101', floor: 1, isOutOfOrder: false, outOfOrderReason: null, qrToken: 't', qrUrl: 'u', qrRegeneratedAt: null };
  const stay = (expectedCheckOutAt: string) => ({
    id: 's', roomId: 'r', roomNumber: '101', guestName: 'Mr Bello', guestPhone: null,
    checkedInAt: '2026-11-03T12:00:00Z', expectedCheckOutAt, checkedOutAt: null,
  });
  const now = new Date('2026-11-05T09:00:00Z');

  it('works out occupancy from the active stay', () => {
    expect(occupancyOf(room, undefined, 'Africa/Lagos', now)).toBe('vacant');
    expect(occupancyOf({ ...room, isOutOfOrder: true }, undefined, 'Africa/Lagos', now)).toBe('out-of-order');
    expect(occupancyOf(room, stay('2026-11-07T11:00:00Z'), 'Africa/Lagos', now)).toBe('occupied');
    expect(occupancyOf(room, stay('2026-11-05T11:00:00Z'), 'Africa/Lagos', now)).toBe('due-out');
    expect(occupancyOf(room, stay('2026-11-04T11:00:00Z'), 'Africa/Lagos', now)).toBe('due-out');
  });

  it('expands a range of room numbers', () => {
    expect(expandRoomNumbers('101', '104')).toEqual(['101', '102', '103', '104']);
    expect(expandRoomNumbers('07', '09')).toEqual(['07', '08', '09']);
    expect(expandRoomNumbers('PH1', '')).toEqual(['PH1']);
    expect(expandRoomNumbers('120', '101')).toBeNull();
    expect(expandRoomNumbers('', '')).toBeNull();
  });
});

describe('periods and realtime messages', () => {
  it('starts "today" at local midnight', () => {
    const start = new Date(periodStart('today', new Date(2026, 10, 5, 15, 30)));
    expect([start.getDate(), start.getHours(), start.getMinutes()]).toEqual([5, 0, 0]);
    expect(new Date(periodStart('7d', new Date(2026, 10, 5, 15, 30))).getDate()).toBe(30);
  });

  it('ignores malformed or unknown socket messages', () => {
    expect(parseMessage('not json')).toBeNull();
    expect(parseMessage(JSON.stringify({ type: 'SOMETHING_ELSE', payload: {} }))).toBeNull();
    expect(parseMessage(JSON.stringify({ type: 'SESSION_REVOKED' }))).toBeNull();
    expect(parseMessage(JSON.stringify({ type: 'SESSION_REVOKED', payload: { reason: 'deactivated' } }))?.type).toBe('SESSION_REVOKED');
  });
});
