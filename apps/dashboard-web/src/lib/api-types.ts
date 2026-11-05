/**
 * Staff API shapes, mirrored from the backend's `packages/contracts`
 * (ekwe7/conciergeIQ). They differ from this repo's `@conciergeiq/contracts`,
 * which was written before the API existed: amounts here are decimal major
 * units (e.g. 9100 for ₦9,100) exactly as the API sends them.
 *
 * When the backend contracts are published as a package, replace this file
 * with an import from it.
 */

export const OrderStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const StaffRole = {
  STAFF: 'STAFF',
  RECEPTIONIST: 'RECEPTIONIST',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
} as const;
export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];
export const STAFF_ROLES_IN_ORDER: readonly StaffRole[] = ['STAFF', 'RECEPTIONIST', 'MANAGER', 'ADMIN'];

export const PaymentMethod = { CASH: 'CASH', CARD: 'CARD', TRANSFER: 'TRANSFER' } as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export interface StaffUser {
  id: string;
  hotelId: string;
  email: string;
  fullName: string;
  role: StaffRole;
  isActive: boolean;
  lastSignedInAt: string | null;
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: StaffUser;
}

export interface Hotel {
  id: string;
  name: string;
  address: string;
  timezone: string;
  currency: string;
}

export interface OrderStatusChange {
  from: OrderStatus | null;
  to: OrderStatus;
  changedBy: string;
  changedAt: string;
}

export interface OrderLine {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface Order {
  id: string;
  number: number;
  roomId: string;
  roomNumber: string;
  stayId: string;
  status: OrderStatus;
  items: OrderLine[];
  totalAmount: number;
  cancelReason: string | null;
  payment: { method: PaymentMethod; paidAt: string } | null;
  history: OrderStatusChange[];
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  number: string;
  floor: number;
  isOutOfOrder: boolean;
  outOfOrderReason: string | null;
  qrToken: string;
  qrUrl: string;
  qrRegeneratedAt: string | null;
}

export interface Stay {
  id: string;
  roomId: string;
  roomNumber: string;
  guestName: string;
  guestPhone: string | null;
  checkedInAt: string;
  expectedCheckOutAt: string;
  checkedOutAt: string | null;
}

export interface StayBill {
  stayId: string;
  ordersCount: number;
  totalCharged: number;
  totalPaid: number;
  outstanding: number;
  openOrders: { orderId: string; orderNumber: number; status: string; itemsSummary: string }[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  photoUrl: string | null;
  isAvailable: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
}

export interface Payment {
  id: string;
  orderId: string;
  orderNumber: number;
  roomNumber: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  recordedBy: string;
  recordedAt: string;
}

export interface PaymentsSummary {
  collected: { total: number; count: number };
  byMethod: Record<PaymentMethod, number>;
  outstanding: { total: number; count: number };
}

export interface OutstandingOrder {
  orderId: string;
  orderNumber: number;
  roomNumber: string;
  amount: number;
}

export const ActivityCategory = {
  ORDERS: 'orders',
  PAYMENTS: 'payments',
  STAYS: 'stays',
  MENU: 'menu',
  STAFF: 'staff',
  ROOMS: 'rooms',
} as const;
export type ActivityCategory = (typeof ActivityCategory)[keyof typeof ActivityCategory];

export interface ActivityEntry {
  id: string;
  eventName: string;
  category: ActivityCategory;
  detail: string;
  actorName: string;
  occurredAt: string;
}

/** Messages pushed on `/ws/staff`. Only the ones the dashboard acts on are listed. */
export type StaffSocketMessage =
  | { type: 'STAFF_CONNECTED'; payload: { userId: string; hotelId: string; serverTime: string } }
  | {
      type: 'NEW_ORDER_RECEIVED';
      payload: {
        orderId: string;
        orderNumber: number;
        roomNumber: string;
        totalAmount: number;
        itemsSummary: string;
        createdAt: string;
      };
    }
  | {
      type: 'ORDER_STATUS_CHANGED';
      payload: {
        orderId: string;
        orderNumber: number;
        previousStatus: OrderStatus;
        newStatus: OrderStatus;
        changedBy?: string;
        updatedAt: string;
      };
    }
  | {
      type: 'PAYMENT_RECORDED';
      payload: { orderId: string; orderNumber: number; amount: number; method: PaymentMethod; recordedAt: string };
    }
  | { type: 'ITEM_AVAILABILITY_CHANGED'; payload: { itemId: string; itemName: string; isAvailable: boolean } }
  | { type: 'SESSION_REVOKED'; payload: { reason: 'deactivated' } };
