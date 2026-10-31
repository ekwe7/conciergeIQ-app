export type OrderStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'CANCELLED';

export type StaffRole = 'STAFF' | 'RECEPTIONIST' | 'MANAGER' | 'ADMIN';

export type PaymentMethod = 'CASH' | 'CARD' | 'ROOM_FOLIO';

export interface Money {
  amountMinor: number;
  currency: string;
}

export interface GuestSession {
  token: string;
  roomNumber: string;
  stayId: string;
  hotelId: string;
  hotelName: string;
  guestName?: string;
  expiresAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  priceMinor: number;
  category: string;
  available: boolean;
  imageUrl?: string;
  dietary?: string[];
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

export interface OrderLineItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
  specialInstructions?: string;
}

export interface Order {
  id: string;
  roomNumber: string;
  stayId: string;
  hotelId: string;
  status: OrderStatus;
  items: OrderLineItem[];
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  type: string;
  status: 'OCCUPIED' | 'VACANT' | 'MAINTENANCE';
  activeStayId?: string;
  qrCodeUrl?: string;
}

export interface Stay {
  id: string;
  roomNumber: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  status: 'ACTIVE' | 'CHECKED_OUT';
  folioBalanceMinor: number;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  active: boolean;
}

export interface ActivityLogEntry {
  id: string;
  actor: string;
  action: string;
  details: string;
  timestamp: string;
}
