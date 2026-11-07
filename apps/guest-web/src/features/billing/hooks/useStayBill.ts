import { useQuery } from '@tanstack/react-query';
import { Order } from '@conciergeiq/contracts';
import { guestApiClient } from '../../../lib/api-client';
import { retrieveGuestSession } from '../../guest-session/session-store';
import { fetchStayOrders } from '../../orders/hooks/useGuestOrderHistory';
import { resolveOrderPaymentStatus } from '../payment-status';
import {
  DigitalStayBill,
  GUEST_DISPLAY_CURRENCY_CODE,
  StayBillLineItem,
  StayBillResponse,
} from '../types';

export const STAY_BILL_QUERY_KEY_PREFIX: readonly string[] = ['guest', 'stay-bill'];

export function createStayBillQueryKey(stayIdentifier: string): string[] {
  return [...STAY_BILL_QUERY_KEY_PREFIX, stayIdentifier];
}

export interface UseStayBillOptions {
  stayIdentifierOverride?: string;
  enabled?: boolean;
}

export interface UseStayBillResult {
  bill: DigitalStayBill | null;
  hasActiveSession: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetchBill: () => Promise<unknown>;
}

/**
 * Converts a backend major-unit amount (e.g. 150.5) into integer minor units (15050).
 */
export function convertMajorToMinorUnits(majorUnitAmount: number): number {
  return Math.round(majorUnitAmount * 100);
}

function isStayBillResponse(candidateResponse: unknown): candidateResponse is StayBillResponse {
  if (!candidateResponse || typeof candidateResponse !== 'object') {
    return false;
  }
  const partialResponse = candidateResponse as Partial<StayBillResponse>;
  return (
    typeof partialResponse.stayId === 'string' &&
    typeof partialResponse.totalCharged === 'number' &&
    typeof partialResponse.totalPaid === 'number' &&
    typeof partialResponse.outstanding === 'number'
  );
}

function createLineItemFromOrder(orderRecord: Order): StayBillLineItem {
  const itemsSummaryText: string = orderRecord.items
    .map((itemRecord) => `${itemRecord.quantity}× ${itemRecord.name}`)
    .join(', ');

  return {
    identifier: `bill_line_${orderRecord.id}`,
    orderIdentifier: orderRecord.id,
    description: itemsSummaryText || 'Room service order',
    dateString: orderRecord.createdAt,
    amountMinor: orderRecord.totalMinor,
    paymentStatus: resolveOrderPaymentStatus(orderRecord),
  };
}

/**
 * Loads the guest's digital folio bill.
 *
 * Totals come exclusively from GET /api/v1/stays/:stayId/bill; the browser never computes
 * them. Itemized lines come from GET /api/v1/guest/orders and are display-only, so a failure
 * there degrades to "totals without itemization" instead of failing the whole page.
 */
export function useStayBill(hookOptions: UseStayBillOptions = {}): UseStayBillResult {
  const activeGuestSession = retrieveGuestSession();
  const effectiveStayIdentifier: string =
    hookOptions.stayIdentifierOverride || activeGuestSession?.stayId || '';
  const hasActiveSession: boolean = effectiveStayIdentifier.length > 0;

  const fetchStayBill = async (): Promise<DigitalStayBill> => {
    const [billSettlement, ordersSettlement] = await Promise.allSettled([
      guestApiClient.get<StayBillResponse>(
        `/api/v1/stays/${encodeURIComponent(effectiveStayIdentifier)}/bill`
      ),
      fetchStayOrders(effectiveStayIdentifier),
    ]);

    if (billSettlement.status === 'rejected') {
      throw billSettlement.reason instanceof Error
        ? billSettlement.reason
        : new Error('Unable to load the folio bill.');
    }

    const billResponse: unknown = billSettlement.value;
    if (!isStayBillResponse(billResponse)) {
      throw new Error('The folio bill response was malformed.');
    }
    if (billResponse.stayId !== effectiveStayIdentifier) {
      throw new Error('The folio bill does not belong to the active stay.');
    }

    const areLineItemsAvailable: boolean = ordersSettlement.status === 'fulfilled';
    const billableOrders: Order[] =
      ordersSettlement.status === 'fulfilled'
        ? ordersSettlement.value.filter((orderRecord) => orderRecord.status !== 'CANCELLED')
        : [];

    return {
      stayIdentifier: billResponse.stayId,
      roomNumber: activeGuestSession?.roomNumber ?? '',
      guestName: activeGuestSession?.guestName ?? '',
      hotelName: activeGuestSession?.hotelName ?? '',
      totalChargedMinor: convertMajorToMinorUnits(billResponse.totalCharged),
      totalPaidMinor: convertMajorToMinorUnits(billResponse.totalPaid),
      outstandingBalanceMinor: convertMajorToMinorUnits(billResponse.outstanding),
      currency: GUEST_DISPLAY_CURRENCY_CODE,
      ordersCount: billResponse.ordersCount,
      lineItems: billableOrders.map(createLineItemFromOrder),
      areLineItemsAvailable,
    };
  };

  const billQuery = useQuery({
    queryKey: createStayBillQueryKey(effectiveStayIdentifier),
    queryFn: fetchStayBill,
    enabled: (hookOptions.enabled ?? true) && hasActiveSession,
    staleTime: 0,
  });

  return {
    bill: billQuery.data ?? null,
    hasActiveSession,
    isLoading: billQuery.isLoading,
    isError: billQuery.isError,
    error: billQuery.error instanceof Error ? billQuery.error : null,
    refetchBill: billQuery.refetch,
  };
}
