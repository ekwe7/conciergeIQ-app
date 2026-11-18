import { Type, Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

export { Value, Type };

/**
 * ============================================================================
 * BRANDED IDENTIFIER TYPES
 * ============================================================================
 * Branded types prevent passing an arbitrary string where a specific domain
 * identifier (e.g. OrderId vs StayId) is required by the compiler.
 */
declare const BrandTagSymbol: unique symbol;

export type BrandedIdentifier<BaseType, BrandTag extends string> = BaseType & {
  readonly [BrandTagSymbol]: BrandTag;
};

export type OrderId = BrandedIdentifier<string, 'OrderId'>;
export type StayId = BrandedIdentifier<string, 'StayId'>;
export type RoomId = BrandedIdentifier<string, 'RoomId'>;
export type HotelId = BrandedIdentifier<string, 'HotelId'>;
export type StaffUserId = BrandedIdentifier<string, 'StaffUserId'>;
export type MenuItemId = BrandedIdentifier<string, 'MenuItemId'>;
export type ActivityLogId = BrandedIdentifier<string, 'ActivityLogId'>;

/** Helper functions to safely cast validated strings to branded identifiers */
export function createOrderId(identifier: string): OrderId {
  return identifier as OrderId;
}

export function createStayId(identifier: string): StayId {
  return identifier as StayId;
}

export function createRoomId(identifier: string): RoomId {
  return identifier as RoomId;
}

export function createHotelId(identifier: string): HotelId {
  return identifier as HotelId;
}

export function createStaffUserId(identifier: string): StaffUserId {
  return identifier as StaffUserId;
}

export function createMenuItemId(identifier: string): MenuItemId {
  return identifier as MenuItemId;
}

export function createActivityLogId(identifier: string): ActivityLogId {
  return identifier as ActivityLogId;
}

/**
 * ============================================================================
 * CANONICAL DOMAIN ENUMS
 * ============================================================================
 */
export const OrderStatusSchema = Type.Union([
  Type.Literal('PENDING'),
  Type.Literal('IN_PROGRESS'),
  Type.Literal('DELIVERED'),
  Type.Literal('CANCELLED'),
]);
export type OrderStatus = Static<typeof OrderStatusSchema>;

export const StaffRole = {
  STAFF: 'STAFF',
  RECEPTIONIST: 'RECEPTIONIST',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
} as const;

export const StaffRoleSchema = Type.Union([
  Type.Literal(StaffRole.STAFF),
  Type.Literal(StaffRole.RECEPTIONIST),
  Type.Literal(StaffRole.MANAGER),
  Type.Literal(StaffRole.ADMIN),
]);
export type StaffRole = Static<typeof StaffRoleSchema>;

export const PaymentMethodSchema = Type.Union([
  Type.Literal('CASH'),
  Type.Literal('CARD'),
  Type.Literal('ROOM_FOLIO'),
]);
export type PaymentMethod = Static<typeof PaymentMethodSchema>;

export const ActivityCategorySchema = Type.Union([
  Type.Literal('ORDER'),
  Type.Literal('STAY'),
  Type.Literal('PAYMENT'),
  Type.Literal('ITEM'),
  Type.Literal('USER'),
  Type.Literal('SYSTEM'),
]);
export type ActivityCategory = Static<typeof ActivityCategorySchema>;

export const RoomStatusSchema = Type.Union([
  Type.Literal('OCCUPIED'),
  Type.Literal('VACANT'),
  Type.Literal('MAINTENANCE'),
]);
export type RoomStatus = Static<typeof RoomStatusSchema>;

export const StayStatusSchema = Type.Union([
  Type.Literal('ACTIVE'),
  Type.Literal('CHECKED_OUT'),
]);
export type StayStatus = Static<typeof StayStatusSchema>;

/**
 * ============================================================================
 * SHARED DOMAIN VALUE OBJECTS & ENTITY SCHEMAS
 * ============================================================================
 */
export const MoneySchema = Type.Object({
  amountMinor: Type.Integer({ minimum: 0, description: 'Amount in minor currency units (e.g. cents)' }),
  currency: Type.String({ minLength: 3, maxLength: 3, description: 'ISO 4217 3-letter currency code' }),
});
export type Money = Static<typeof MoneySchema>;

export const GuestSessionSchema = Type.Object({
  token: Type.String({ minLength: 1 }),
  roomNumber: Type.String({ minLength: 1 }),
  stayId: Type.String({ minLength: 1 }),
  hotelId: Type.String({ minLength: 1 }),
  hotelName: Type.String({ minLength: 1 }),
  guestName: Type.Optional(Type.String()),
  expiresAt: Type.String({ description: 'ISO 8601 date-time string' }),
});
export type GuestSession = Static<typeof GuestSessionSchema>;

export const MenuItemSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  name: Type.String({ minLength: 1 }),
  description: Type.String(),
  priceMinor: Type.Integer({ minimum: 0 }),
  category: Type.String({ minLength: 1 }),
  available: Type.Boolean(),
  imageUrl: Type.Optional(Type.String()),
  dietary: Type.Optional(Type.Array(Type.String())),
});
export type MenuItem = Static<typeof MenuItemSchema>;

export const CartItemSchema = Type.Object({
  item: MenuItemSchema,
  quantity: Type.Integer({ minimum: 1 }),
  specialInstructions: Type.Optional(Type.String()),
});
export type CartItem = Static<typeof CartItemSchema>;

export const OrderLineItemSchema = Type.Object({
  itemId: Type.String({ minLength: 1 }),
  name: Type.String({ minLength: 1 }),
  quantity: Type.Integer({ minimum: 1 }),
  unitPriceMinor: Type.Integer({ minimum: 0 }),
  totalMinor: Type.Integer({ minimum: 0 }),
  specialInstructions: Type.Optional(Type.String()),
});
export type OrderLineItem = Static<typeof OrderLineItemSchema>;

export const OrderSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  roomNumber: Type.String({ minLength: 1 }),
  stayId: Type.String({ minLength: 1 }),
  hotelId: Type.String({ minLength: 1 }),
  status: OrderStatusSchema,
  items: Type.Array(OrderLineItemSchema),
  subtotalMinor: Type.Integer({ minimum: 0 }),
  taxMinor: Type.Integer({ minimum: 0 }),
  totalMinor: Type.Integer({ minimum: 0 }),
  createdAt: Type.String({ description: 'ISO 8601 date-time string' }),
  updatedAt: Type.String({ description: 'ISO 8601 date-time string' }),
});
export type Order = Static<typeof OrderSchema>;

export const RoomSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  roomNumber: Type.String({ minLength: 1 }),
  floor: Type.Integer(),
  type: Type.String({ minLength: 1 }),
  status: RoomStatusSchema,
  activeStayId: Type.Optional(Type.String()),
  qrCodeUrl: Type.Optional(Type.String()),
});
export type Room = Static<typeof RoomSchema>;

export const StaySchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  roomNumber: Type.String({ minLength: 1 }),
  guestName: Type.String({ minLength: 1 }),
  checkInDate: Type.String({ description: 'ISO 8601 date-time string' }),
  checkOutDate: Type.String({ description: 'ISO 8601 date-time string' }),
  status: StayStatusSchema,
  folioBalanceMinor: Type.Integer(),
});
export type Stay = Static<typeof StaySchema>;

export const CheckInSchema = Type.Object({
  guestName: Type.String({ minLength: 1 }),
  guestPhone: Type.Optional(Type.String()),
  expectedCheckOutAt: Type.String({ description: 'ISO 8601 date-time string' }),
});
export type CheckInInput = Static<typeof CheckInSchema>;

export const StayBillOpenOrderItemSchema = Type.Object({
  orderId: Type.String({ minLength: 1 }),
  orderNumber: Type.Integer(),
  status: Type.String(),
  itemsSummary: Type.String(),
});
export type StayBillOpenOrderItem = Static<typeof StayBillOpenOrderItemSchema>;

export const StayBillSchema = Type.Object({
  stayId: Type.String({ minLength: 1 }),
  ordersCount: Type.Integer(),
  totalCharged: Type.Number(),
  totalPaid: Type.Number(),
  outstanding: Type.Number(),
  openOrders: Type.Array(StayBillOpenOrderItemSchema),
});
export type StayBill = Static<typeof StayBillSchema>;

export const StaffUserSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  name: Type.String({ minLength: 1 }),
  email: Type.String({ minLength: 1 }),
  role: StaffRoleSchema,
  active: Type.Boolean(),
});
export type StaffUser = Static<typeof StaffUserSchema>;

export const ActivityLogEntrySchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  actor: Type.String({ minLength: 1 }),
  action: Type.String({ minLength: 1 }),
  details: Type.String(),
  timestamp: Type.String({ description: 'ISO 8601 date-time string' }),
});
export type ActivityLogEntry = Static<typeof ActivityLogEntrySchema>;

/**
 * ============================================================================
 * API REQUEST & RESPONSE PAYLOAD SCHEMAS
 * ============================================================================
 */
export const CreateOrderRequestSchema = Type.Object({
  roomNumber: Type.String({ minLength: 1 }),
  stayId: Type.String({ minLength: 1 }),
  items: Type.Array(
    Type.Object({
      itemId: Type.String({ minLength: 1 }),
      quantity: Type.Integer({ minimum: 1 }),
      specialInstructions: Type.Optional(Type.String()),
    }),
    { minItems: 1 }
  ),
});
export type CreateOrderRequest = Static<typeof CreateOrderRequestSchema>;

export const UpdateOrderStatusRequestSchema = Type.Object({
  status: OrderStatusSchema,
  rejectionReason: Type.Optional(Type.String()),
});
export type UpdateOrderStatusRequest = Static<typeof UpdateOrderStatusRequestSchema>;

export const UpdateOrderStatusSchema = Type.Union([
  Type.Object({
    status: Type.Union([
      Type.Literal('IN_PROGRESS'),
      Type.Literal('DELIVERED'),
    ]),
    reason: Type.Optional(Type.String()),
  }),
  Type.Object({
    status: Type.Literal('CANCELLED'),
    reason: Type.String({ minLength: 1, maxLength: 255 }),
  }),
]);
export type UpdateOrderStatusPayload = Static<typeof UpdateOrderStatusSchema>;

export const VerifyGuestSessionRequestSchema = Type.Object({
  qrToken: Type.String({ minLength: 1 }),
});
export type VerifyGuestSessionRequest = Static<typeof VerifyGuestSessionRequestSchema>;

export const ServiceRequestItemSchema = Type.Object({
  itemId: Type.String({ minLength: 1 }),
  name: Type.String({ minLength: 1 }),
  quantity: Type.Integer({ minimum: 1 }),
});
export type ServiceRequestItem = Static<typeof ServiceRequestItemSchema>;

export const ServiceRequestCategorySchema = Type.Union([
  Type.Literal('TOWELS'),
  Type.Literal('TOILETRIES'),
  Type.Literal('HOUSEKEEPING'),
  Type.Literal('AMENITIES'),
  Type.Literal('OTHER'),
]);
export type ServiceRequestCategory = Static<typeof ServiceRequestCategorySchema>;
export const GuestServiceRequestCategorySchema = ServiceRequestCategorySchema;
export type GuestServiceRequestCategory = ServiceRequestCategory;

export const GuestServiceRequestCreateSchema = Type.Object({
  roomNumber: Type.String({ minLength: 1 }),
  stayId: Type.String({ minLength: 1 }),
  category: Type.Optional(ServiceRequestCategorySchema),
  items: Type.Array(ServiceRequestItemSchema, { minItems: 1 }),
  notes: Type.Optional(Type.String()),
  specialInstructions: Type.Optional(Type.String()),
});
export type GuestServiceRequestCreate = Static<typeof GuestServiceRequestCreateSchema>;

export const GuestServiceRequestResponseSchema = Type.Object({
  requestId: Type.String({ minLength: 1 }),
  status: Type.Union([
    Type.Literal('RECEIVED'),
    Type.Literal('ACKNOWLEDGED'),
    Type.Literal('IN_PROGRESS'),
    Type.Literal('COMPLETED'),
    Type.Literal('CANCELLED'),
  ]),
  estimatedDeliveryMinutes: Type.Integer({ minimum: 1 }),
  roomNumber: Type.String({ minLength: 1 }),
  items: Type.Array(ServiceRequestItemSchema),
  createdAt: Type.String(),
});
export type GuestServiceRequestResponse = Static<typeof GuestServiceRequestResponseSchema>;

/**
 * ============================================================================
 * DOMAIN EVENTS
 * ============================================================================
 */
export const OrderCreatedEventSchema = Type.Object({
  eventName: Type.Literal('order.created'),
  eventId: Type.String({ minLength: 1 }),
  timestamp: Type.String(),
  hotelId: Type.String({ minLength: 1 }),
  payload: Type.Object({
    orderId: Type.String({ minLength: 1 }),
    roomNumber: Type.String({ minLength: 1 }),
    stayId: Type.String({ minLength: 1 }),
    totalMinor: Type.Integer({ minimum: 0 }),
    itemCount: Type.Integer({ minimum: 1 }),
  }),
});
export type OrderCreatedEvent = Static<typeof OrderCreatedEventSchema>;

export const OrderStatusChangedEventSchema = Type.Object({
  eventName: Type.Literal('order.status_changed'),
  eventId: Type.String({ minLength: 1 }),
  timestamp: Type.String(),
  hotelId: Type.String({ minLength: 1 }),
  payload: Type.Object({
    orderId: Type.String({ minLength: 1 }),
    previousStatus: OrderStatusSchema,
    newStatus: OrderStatusSchema,
    updatedBy: Type.String({ minLength: 1 }),
  }),
});
export type OrderStatusChangedEvent = Static<typeof OrderStatusChangedEventSchema>;

export const StayCheckedInEventSchema = Type.Object({
  eventName: Type.Literal('stay.checked_in'),
  eventId: Type.String({ minLength: 1 }),
  timestamp: Type.String(),
  hotelId: Type.String({ minLength: 1 }),
  payload: Type.Object({
    stayId: Type.String({ minLength: 1 }),
    roomNumber: Type.String({ minLength: 1 }),
    guestName: Type.String({ minLength: 1 }),
  }),
});
export type StayCheckedInEvent = Static<typeof StayCheckedInEventSchema>;

export const StayCheckedOutEventSchema = Type.Object({
  eventName: Type.Literal('stay.checked_out'),
  eventId: Type.String({ minLength: 1 }),
  timestamp: Type.String(),
  hotelId: Type.String({ minLength: 1 }),
  payload: Type.Object({
    stayId: Type.String({ minLength: 1 }),
    roomNumber: Type.String({ minLength: 1 }),
    folioBalanceMinor: Type.Integer(),
  }),
});
export type StayCheckedOutEvent = Static<typeof StayCheckedOutEventSchema>;

export const PaymentRecordedEventSchema = Type.Object({
  eventName: Type.Literal('payment.recorded'),
  eventId: Type.String({ minLength: 1 }),
  timestamp: Type.String(),
  hotelId: Type.String({ minLength: 1 }),
  payload: Type.Object({
    paymentId: Type.String({ minLength: 1 }),
    stayId: Type.String({ minLength: 1 }),
    amountMinor: Type.Integer({ minimum: 0 }),
    paymentMethod: PaymentMethodSchema,
  }),
});
export type PaymentRecordedEvent = Static<typeof PaymentRecordedEventSchema>;

export const ItemAvailabilityChangedEventSchema = Type.Object({
  eventName: Type.Literal('item.availability_changed'),
  eventId: Type.String({ minLength: 1 }),
  timestamp: Type.String(),
  hotelId: Type.String({ minLength: 1 }),
  payload: Type.Object({
    itemId: Type.String({ minLength: 1 }),
    available: Type.Boolean(),
  }),
});
export type ItemAvailabilityChangedEvent = Static<typeof ItemAvailabilityChangedEventSchema>;

export const UserDeactivatedEventSchema = Type.Object({
  eventName: Type.Literal('user.deactivated'),
  eventId: Type.String({ minLength: 1 }),
  timestamp: Type.String(),
  hotelId: Type.String({ minLength: 1 }),
  payload: Type.Object({
    userId: Type.String({ minLength: 1 }),
    deactivatedBy: Type.String({ minLength: 1 }),
  }),
});
export type UserDeactivatedEvent = Static<typeof UserDeactivatedEventSchema>;

export const DomainEventSchema = Type.Union([
  OrderCreatedEventSchema,
  OrderStatusChangedEventSchema,
  StayCheckedInEventSchema,
  StayCheckedOutEventSchema,
  PaymentRecordedEventSchema,
  ItemAvailabilityChangedEventSchema,
  UserDeactivatedEventSchema,
]);
export type DomainEvent = Static<typeof DomainEventSchema>;

/**
 * ============================================================================
 * WEBSOCKET MESSAGES (GUEST & STAFF GATEWAYS)
 * ============================================================================
 */
export const GuestWSMessageSchema = Type.Union([
  Type.Object({
    type: Type.Literal('GUEST_SESSION_CONNECTED'),
    session: GuestSessionSchema,
  }),
  Type.Object({
    type: Type.Literal('ORDER_STATUS_UPDATED'),
    orderId: Type.String({ minLength: 1 }),
    newStatus: OrderStatusSchema,
    updatedAt: Type.String(),
  }),
  Type.Object({
    type: Type.Literal('GUEST_ASSISTANCE_REQUESTED'),
    roomNumber: Type.String({ minLength: 1 }),
    requestType: Type.String({ minLength: 1 }),
    notes: Type.Optional(Type.String()),
  }),
  Type.Object({
    type: Type.Literal('PING'),
    timestamp: Type.Number(),
  }),
  Type.Object({
    type: Type.Literal('PONG'),
    timestamp: Type.Number(),
  }),
]);
export type GuestWSMessage = Static<typeof GuestWSMessageSchema>;

export const StaffWSMessageSchema = Type.Union([
  Type.Object({
    type: Type.Literal('STAFF_AUTHENTICATED'),
    staffUser: StaffUserSchema,
  }),
  Type.Object({
    type: Type.Literal('NEW_ORDER_ALERT'),
    order: OrderSchema,
  }),
  Type.Object({
    type: Type.Literal('ORDER_STATUS_CHANGED'),
    orderId: Type.String({ minLength: 1 }),
    status: OrderStatusSchema,
    updatedBy: Type.String({ minLength: 1 }),
    updatedAt: Type.String(),
  }),
  Type.Object({
    type: Type.Literal('ASSISTANCE_CALL_ALERT'),
    roomNumber: Type.String({ minLength: 1 }),
    serviceCategory: Type.String({ minLength: 1 }),
    timestamp: Type.String(),
  }),
  Type.Object({
    type: Type.Literal('PING'),
    timestamp: Type.Number(),
  }),
  Type.Object({
    type: Type.Literal('PONG'),
    timestamp: Type.Number(),
  }),
]);
export type StaffWSMessage = Static<typeof StaffWSMessageSchema>;
