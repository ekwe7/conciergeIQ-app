import { Order } from '@conciergeiq/contracts';
import { PaymentSettlementStatus } from './types';

/**
 * The backend order payload carries a nullable `payment` record that is not yet part of
 * the shared guest Order contract. It is read defensively here.
 */
interface OrderWithOptionalPayment extends Order {
  payment?: { method?: string; paidAt?: string } | null;
}

/**
 * Derives how an order is settled on the folio from backend-provided fields only.
 */
export function resolveOrderPaymentStatus(orderRecord: Order): PaymentSettlementStatus {
  if (orderRecord.status === 'CANCELLED') {
    return 'NOT_CHARGED';
  }
  const paymentRecord = (orderRecord as OrderWithOptionalPayment).payment;
  if (paymentRecord && typeof paymentRecord === 'object') {
    return 'PAID';
  }
  return 'CHARGED_TO_ROOM_FOLIO';
}

export function formatPaymentStatusLabel(paymentStatus: PaymentSettlementStatus): string {
  switch (paymentStatus) {
    case 'PAID':
      return 'Paid';
    case 'NOT_CHARGED':
      return 'Not charged';
    case 'CHARGED_TO_ROOM_FOLIO':
    default:
      return 'Charged to room folio';
  }
}
