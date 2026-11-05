import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, LoadingRows, PageHeader, Panel, table } from '../components/ui/Page';
import { Segmented } from '../components/ui/Segmented';
import { useToast } from '../components/ui/Toast';
import { cx } from '../components/ui/cx';
import { useCurrentUser } from '../features/auth/AuthProvider';
import { useHotelLocale } from '../features/hotel/useHotel';
import { periodStart, type Period } from '../features/payments/api';
import { api, saveBlob, withQuery } from '../lib/api-client';
import type { ActivityCategory, ActivityEntry } from '../lib/api-types';
import { describeError } from '../lib/error-handler';
import { formatDateTime } from '../lib/format';
import { queryKeys } from '../lib/query-keys';

type CategoryFilter = 'all' | ActivityCategory;

const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  orders: 'Orders',
  payments: 'Payments',
  stays: 'Stays',
  menu: 'Menu',
  staff: 'Staff',
  rooms: 'Rooms',
};

const PERIOD_LABEL: Record<Period, string> = { today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days' };
const LIMIT = 500;

export function ActivityPage() {
  const { hotelId } = useCurrentUser();
  const { timeZone } = useHotelLocale();
  const toast = useToast();
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [period, setPeriod] = useState<Period>('today');
  const [exporting, setExporting] = useState(false);

  const filters = { category: category === 'all' ? undefined : category, from: periodStart(period) };

  const activity = useQuery({
    queryKey: [...queryKeys.activity(hotelId), category, period],
    queryFn: ({ signal }) => api.get<ActivityEntry[]>(withQuery('/activity', { ...filters, limit: LIMIT }), { signal }),
  });

  async function exportCsv() {
    setExporting(true);
    try {
      saveBlob(await api.getBlob(withQuery('/activity.csv', filters)), `activity-${period}.csv`);
    } catch (error) {
      toast.error(describeError(error));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Activity log"
        description="Every order, payment, stay and change made in the dashboard, with who did it."
        actions={
          <Button onClick={exportCsv} pending={exporting}>
            <Download className="h-4 w-4" strokeWidth={1.75} />
            Export CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Segmented
          label="Category"
          value={category}
          onChange={setCategory}
          options={[
            { value: 'all', label: 'All' },
            ...(Object.keys(CATEGORY_LABEL) as ActivityCategory[]).map((value) => ({ value, label: CATEGORY_LABEL[value] })),
          ]}
        />
        <Segmented
          label="Period"
          value={period}
          onChange={setPeriod}
          options={(Object.keys(PERIOD_LABEL) as Period[]).map((value) => ({ value, label: PERIOD_LABEL[value] }))}
        />
      </div>

      <Panel>
        {activity.isPending && <LoadingRows rows={8} label="Loading activity" />}
        {activity.error && <ErrorState message={describeError(activity.error)} onRetry={() => void activity.refetch()} />}
        {activity.data?.length === 0 && <EmptyState title="Nothing recorded for these filters" />}
        {activity.data && activity.data.length > 0 && (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th}>Time</th>
                  <th className={table.th}>What happened</th>
                  <th className={table.th}>Area</th>
                  <th className={table.th}>By</th>
                </tr>
              </thead>
              <tbody className={table.body}>
                {activity.data.map((entry) => (
                  <tr key={entry.id} className={table.row}>
                    <td className={cx(table.td, 'tabular whitespace-nowrap text-xs')}>{formatDateTime(entry.occurredAt, timeZone)}</td>
                    <td className={cx(table.td, 'text-ink')}>{entry.detail}</td>
                    <td className={table.td}>{CATEGORY_LABEL[entry.category] ?? entry.category}</td>
                    <td className={cx(table.td, 'whitespace-nowrap')}>{entry.actorName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {activity.data?.length === LIMIT && (
        <p className="mt-3 text-xs text-ink-3">Showing the latest {LIMIT} entries. Export the CSV for the full period.</p>
      )}
    </>
  );
}
