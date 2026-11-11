import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  createOrderId,
  createStayId,
  createRoomId,
  OrderSchema,
  GuestSessionSchema,
  MenuItemSchema,
  OrderCreatedEventSchema,
  GuestWSMessageSchema,
  StaffWSMessageSchema,
  CreateOrderRequestSchema,
  UpdateOrderStatusRequestSchema,
  UpdateOrderStatusSchema,
  GuestServiceRequestCreateSchema,
  CheckInSchema,
  StayBillSchema,
  UpdateItemAvailabilitySchema,
} from '../src/index';

describe('Contracts Package - TypeBox Runtime Schemas and Branded Types', () => {
  it('creates strongly branded identifiers properly', () => {
    const rawOrderIdentifier = 'order_unique_9921';
    const brandedOrderId = createOrderId(rawOrderIdentifier);
    expect(brandedOrderId).toBe(rawOrderIdentifier);

    const rawStayIdentifier = 'stay_unique_1012';
    const brandedStayId = createStayId(rawStayIdentifier);
    expect(brandedStayId).toBe(rawStayIdentifier);

    const rawRoomIdentifier = 'room_unique_402';
    const brandedRoomId = createRoomId(rawRoomIdentifier);
    expect(brandedRoomId).toBe(rawRoomIdentifier);
  });

  it('validates valid GuestSession data accurately', () => {
    const validGuestSession = {
      token: 'secure_guest_token_8829',
      roomNumber: '402',
      stayId: 'stay_demo_9921',
      hotelId: 'htl_lagos_grand',
      hotelName: 'The Lagos Grand Hotel & Suites',
      guestName: 'Adeola Johnson',
      expiresAt: '2026-11-03T12:00:00.000Z',
    };

    const isGuestSessionValid = Value.Check(GuestSessionSchema, validGuestSession);
    expect(isGuestSessionValid).toBe(true);

    const invalidGuestSession = {
      token: '', // empty string violates minLength 1
      roomNumber: '402',
    };
    expect(Value.Check(GuestSessionSchema, invalidGuestSession)).toBe(false);
  });

  it('validates complete Order data structure', () => {
    const validOrder = {
      id: 'ORD-8821',
      roomNumber: '402',
      stayId: 'stay_demo_9921',
      hotelId: 'htl_lagos_grand',
      status: 'PENDING' as const,
      items: [
        {
          itemId: 'item_avocado_toast',
          name: 'Artisan Avocado & Poached Egg Toast',
          quantity: 2,
          unitPriceMinor: 1600,
          totalMinor: 3200,
          specialInstructions: 'Extra sourdough toast',
        },
      ],
      subtotalMinor: 3200,
      taxMinor: 256,
      totalMinor: 3456,
      createdAt: '2026-11-02T19:00:00.000Z',
      updatedAt: '2026-11-02T19:00:00.000Z',
    };

    expect(Value.Check(OrderSchema, validOrder)).toBe(true);

    const invalidOrderWithNegativeSubtotal = {
      ...validOrder,
      subtotalMinor: -500, // Negative violates minimum 0
    };
    expect(Value.Check(OrderSchema, invalidOrderWithNegativeSubtotal)).toBe(false);
  });

  it('validates MenuItem schema including dietary tags', () => {
    const validMenuItem = {
      id: 'item_1',
      name: 'Artisan Avocado & Poached Egg Toast',
      description: 'Sourdough toast with organic poached eggs',
      priceMinor: 1600,
      category: 'Breakfast',
      available: true,
      dietary: ['Vegetarian', 'Organic'],
    };

    expect(Value.Check(MenuItemSchema, validMenuItem)).toBe(true);
  });

  it('validates API request schemas for order placement and status update', () => {
    const validCreateOrderRequest = {
      roomNumber: '402',
      stayId: 'stay_demo_9921',
      items: [
        { itemId: 'item_1', quantity: 2 },
      ],
    };
    expect(Value.Check(CreateOrderRequestSchema, validCreateOrderRequest)).toBe(true);

    const invalidEmptyOrderRequest = {
      roomNumber: '402',
      stayId: 'stay_demo_9921',
      items: [], // Violates minItems 1
    };
    expect(Value.Check(CreateOrderRequestSchema, invalidEmptyOrderRequest)).toBe(false);

    const validStatusUpdateRequest = {
      status: 'IN_PROGRESS' as const,
      rejectionReason: undefined,
    };
    expect(Value.Check(UpdateOrderStatusRequestSchema, validStatusUpdateRequest)).toBe(true);

    expect(
      Value.Check(UpdateOrderStatusSchema, { status: 'IN_PROGRESS' }),
    ).toBe(true);
    expect(
      Value.Check(UpdateOrderStatusSchema, {
        status: 'CANCELLED',
        reason: 'Guest changed mind',
      }),
    ).toBe(true);
    expect(
      Value.Check(UpdateOrderStatusSchema, {
        status: 'CANCELLED',
        reason: '',
      }),
    ).toBe(false);
  });

  it('validates Domain Event payloads', () => {
    const validOrderCreatedEvent = {
      eventName: 'order.created' as const,
      eventId: 'evt_991823',
      timestamp: '2026-11-02T19:30:00.000Z',
      hotelId: 'htl_lagos_grand',
      payload: {
        orderId: 'ORD-8821',
        roomNumber: '402',
        stayId: 'stay_demo_9921',
        totalMinor: 3456,
        itemCount: 1,
      },
    };

    expect(Value.Check(OrderCreatedEventSchema, validOrderCreatedEvent)).toBe(true);
  });

  it('validates WebSocket messages for guest and staff gateways', () => {
    const validGuestSocketMessage = {
      type: 'ORDER_STATUS_UPDATED' as const,
      orderId: 'ORD-8821',
      newStatus: 'IN_PROGRESS' as const,
      updatedAt: '2026-11-02T19:35:00.000Z',
    };
    expect(Value.Check(GuestWSMessageSchema, validGuestSocketMessage)).toBe(true);

    const validStaffSocketMessage = {
      type: 'PING' as const,
      timestamp: Date.now(),
    };
    expect(Value.Check(StaffWSMessageSchema, validStaffSocketMessage)).toBe(true);
  });

  it('validates GuestServiceRequestCreateSchema payloads', () => {
    const validGuestServiceRequest = {
      roomNumber: '402',
      stayId: 'stay_demo_9921',
      category: 'TOWELS' as const,
      items: [
        {
          itemId: 'amenity_extra_towels',
          name: 'Extra towels',
          quantity: 2,
        },
      ],
      specialInstructions: 'Please leave outside door',
    };
    expect(Value.Check(GuestServiceRequestCreateSchema, validGuestServiceRequest)).toBe(true);

    const invalidEmptyItemsServiceRequest = {
      roomNumber: '402',
      stayId: 'stay_demo_9921',
      items: [],
    };
    expect(Value.Check(GuestServiceRequestCreateSchema, invalidEmptyItemsServiceRequest)).toBe(false);
  });

  it('validates CheckInSchema payloads accurately', () => {
    const validCheckInRequest = {
      guestName: 'Mrs. Funke Adebayo',
      guestPhone: '+234 801 234 5678',
      expectedCheckOutAt: '2026-11-12T12:00:00.000Z',
    };
    expect(Value.Check(CheckInSchema, validCheckInRequest)).toBe(true);

    const invalidEmptyGuestName = {
      guestName: '',
      expectedCheckOutAt: '2026-11-12T12:00:00.000Z',
    };
    expect(Value.Check(CheckInSchema, invalidEmptyGuestName)).toBe(false);
  });

  it('validates StayBillSchema folio summary payloads accurately', () => {
    const validStayBillPayload = {
      stayId: 'stay_102',
      ordersCount: 6,
      totalCharged: 64300,
      totalPaid: 52100,
      outstanding: 12200,
      openOrders: [
        {
          orderId: 'order_1044',
          orderNumber: 1044,
          status: 'IN_PROGRESS',
          itemsSummary: 'Pepper soup',
        },
      ],
    };
    expect(Value.Check(StayBillSchema, validStayBillPayload)).toBe(true);
  });

  it('validates UpdateItemAvailabilitySchema payloads accurately', () => {
    expect(Value.Check(UpdateItemAvailabilitySchema, { isAvailable: true })).toBe(true);
    expect(Value.Check(UpdateItemAvailabilitySchema, { isAvailable: false })).toBe(true);
    expect(Value.Check(UpdateItemAvailabilitySchema, { isAvailable: 'yes' })).toBe(false);
    expect(Value.Check(UpdateItemAvailabilitySchema, {})).toBe(false);
  });
});
