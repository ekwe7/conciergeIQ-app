import { useQuery } from '@tanstack/react-query';
import { api, withQuery } from '../../lib/api-client';
import type { OutstandingOrder, Payment, PaymentsSummary } from '../../lib/api-types';
import { queryKeys } from '../../lib/query-keys';
import { useCurrentUser } from '../auth/AuthProvider';

export type Period = 'today' | '7d' | '30d';

/** The start of the period in the browser's local time; the API takes ISO timestamps. */
export function periodStart(period: Period, now = new Date()): string {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === '7d') start.setDate(start.getDate() - 6);
  if (period === '30d') start.setDate(start.getDate() - 29);
  return start.toISOString();
}

export function useOutstanding(enabled = true) {
  const { hotelId } = useCurrentUser();
  return useQuery({
    queryKey: [...queryKeys.payments(hotelId), 'outstanding'],
    queryFn: ({ signal }) => api.get<OutstandingOrder[]>('/payments/outstanding', { signal }),
    enabled,
  });
}

export function usePaymentsSummary(period: Period) {
  const { hotelId } = useCurrentUser();
  return useQuery({
    queryKey: [...queryKeys.payments(hotelId), 'summary', period],
    queryFn: ({ signal }) => api.get<PaymentsSummary>(withQuery('/payments/summary', { from: periodStart(period) }), { signal }),
  });
}

export function usePayments(period: Period) {
  const { hotelId } = useCurrentUser();
  return useQuery({
    queryKey: [...queryKeys.payments(hotelId), 'list', period],
    queryFn: ({ signal }) => api.get<Payment[]>(withQuery('/payments', { from: periodStart(period) }), { signal }),
  });
}
