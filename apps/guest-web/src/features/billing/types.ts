/**
 * Settlement state of a single order on the guest's room folio.
 * - PAID: staff recorded a payment against the order.
 * - CHARGED_TO_ROOM_FOLIO: the order is owed and will be settled at check-out.
 * - NOT_CHARGED: the order was cancelled and carries no charge.
 */
export type PaymentSettlementStatus = 'PAID' | 'CHARGED_TO_ROOM_FOLIO' | 'NOT_CHARGED';

/**
 * Currency used for guest-facing money display. The guest session contract does not
 * yet carry the hotel currency, so this mirrors the default used across the guest app.
 */
export const GUEST_DISPLAY_CURRENCY_CODE: string = 'USD';

/**
 * Backend response shape for GET /api/v1/stays/:stayId/bill.
 * Monetary amounts are expressed in major currency units (e.g. 150.5 = 150.50).
 */
export interface StayBillResponse {
  stayId: string;
  ordersCount: number;
  totalCharged: number;
  totalPaid: number;
  outstanding: number;
  openOrders?: { orderId: string; orderNumber: number; status: string; itemsSummary: string }[];
}

export interface StayBillLineItem {
  identifier: string;
  orderIdentifier: string;
  description: string;
  dateString: string;
  amountMinor: number;
  paymentStatus: PaymentSettlementStatus;
}

export interface DigitalStayBill {
  stayIdentifier: string;
  roomNumber: string;
  guestName: string;
  hotelName: string;
  /** Authoritative backend totals, converted to minor currency units. */
  totalChargedMinor: number;
  totalPaidMinor: number;
  outstandingBalanceMinor: number;
  currency: string;
  ordersCount: number;
  /** Itemized orders for display only; never used to derive totals. */
  lineItems: StayBillLineItem[];
  /** False when the itemized order list could not be loaded but totals are available. */
  areLineItemsAvailable: boolean;
}
