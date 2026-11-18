import { LogOut, Users } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { StatusLabel } from '../../../components/ui/Status';
import type { Stay } from '../../../lib/api-types';
import { formatDay, isSameDay } from '../../../lib/format';

export interface StaysTableProperties {
  staysList: Stay[];
  openOrderCountByStayId?: Map<string, number>;
  hotelTimeZone?: string;
  canCheckGuestsInAndOut?: boolean;
  onCheckOutRequest: (selectedStay: Stay) => void;
}

export function StaysTable({
  staysList,
  openOrderCountByStayId,
  hotelTimeZone,
  canCheckGuestsInAndOut = true,
  onCheckOutRequest,
}: StaysTableProperties) {
  if (staysList.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface p-8 text-center">
        <Users className="mx-auto h-8 w-8 text-ink-3" strokeWidth={1.5} />
        <h3 className="mt-2 text-sm font-semibold text-ink">No active stays found</h3>
        <p className="mt-1 text-xs text-ink-2">
          There are currently no guests checked into rooms matching the active filter.
        </p>
      </div>
    );
  }

  const currentDateInstance = new Date();

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full text-left text-[13px] border-collapse">
        <thead>
          <tr className="border-b border-line bg-canvas/50 text-xs font-medium text-ink-2">
            <th className="px-4 py-3">Room</th>
            <th className="px-4 py-3">Guest</th>
            <th className="px-4 py-3">Checked in</th>
            <th className="px-4 py-3">Expected departure</th>
            <th className="px-4 py-3">Active orders</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line text-ink">
          {staysList.map((currentStayItem) => {
            const openOrdersCount =
              openOrderCountByStayId?.get(currentStayItem.id) ?? 0;

            const isDueOutToday =
              new Date(currentStayItem.expectedCheckOutAt) <= currentDateInstance ||
              isSameDay(
                currentStayItem.expectedCheckOutAt,
                hotelTimeZone,
                currentDateInstance,
              );

            const stayStatusTone = isDueOutToday ? 'pending' : 'done';
            const stayStatusLabel = isDueOutToday ? 'Due out' : 'Occupied';

            return (
              <tr
                key={currentStayItem.id}
                className="hover:bg-canvas/30 transition-colors"
              >
                {/* Room Number */}
                <td className="px-4 py-3.5 font-bold tabular text-ink text-sm">
                  {currentStayItem.roomNumber}
                </td>

                {/* Guest Information */}
                <td className="px-4 py-3.5">
                  <div className="font-medium text-ink">
                    {currentStayItem.guestName}
                  </div>
                  {currentStayItem.guestPhone ? (
                    <div className="text-xs text-ink-3">
                      {currentStayItem.guestPhone}
                    </div>
                  ) : null}
                </td>

                {/* Check-in time / arrival */}
                <td className="px-4 py-3.5 text-ink-2 tabular">
                  {formatDay(currentStayItem.checkedInAt, hotelTimeZone)}
                </td>

                {/* Expected departure date */}
                <td className="px-4 py-3.5 text-ink-2 tabular">
                  {formatDay(currentStayItem.expectedCheckOutAt, hotelTimeZone)}
                </td>

                {/* Active orders count */}
                <td className="px-4 py-3.5">
                  {openOrdersCount > 0 ? (
                    <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
                      {openOrdersCount}{' '}
                      {openOrdersCount === 1 ? 'open order' : 'open orders'}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-3">No open orders</span>
                  )}
                </td>

                {/* Status Badge */}
                <td className="px-4 py-3.5">
                  <StatusLabel tone={stayStatusTone}>
                    {stayStatusLabel}
                  </StatusLabel>
                </td>

                {/* Action Buttons */}
                <td className="px-4 py-3.5 text-right">
                  {canCheckGuestsInAndOut && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onCheckOutRequest(currentStayItem)}
                      className="inline-flex items-center gap-1.5"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Check out</span>
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
