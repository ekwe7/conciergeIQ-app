import { describeError } from '../../../lib/error-handler';
import { Permission } from '../../../lib/permissions';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../../../components/ui/Toast';
import type { MenuItem } from '../../../lib/api-types';
import { useSetAvailability } from '../api';

export interface AvailabilityToggleSwitchProperties {
  item: MenuItem;
  disabled?: boolean;
  onToggleSuccess?: (targetItem: MenuItem, nextIsAvailable: boolean) => void;
  onToggleError?: (caughtError: unknown) => void;
}

/**
 * AvailabilityToggleSwitch — One-tap 86ing control for menu catalog items.
 *
 * Displays a tactile toggle switch:
 * - Green "Available" when in stock
 * - Red "Unavailable (86'd)" when out of stock
 *
 * Dispatches PATCH /api/v1/menu/items/:id/availability with optimistic UI caching.
 * Disabled for STAFF role (requires Permission.MARK_ITEMS_UNAVAILABLE).
 */
export function AvailabilityToggleSwitch({
  item,
  disabled = false,
  onToggleSuccess,
  onToggleError,
}: AvailabilityToggleSwitchProperties) {
  const { can } = useAuth();
  const toastNotification = useToast();
  const setAvailabilityMutation = useSetAvailability();

  const userCanToggleAvailability = can(Permission.MARK_ITEMS_UNAVAILABLE);
  const isSwitchDisabled = disabled || !userCanToggleAvailability;

  function handleToggleAvailability() {
    if (isSwitchDisabled || setAvailabilityMutation.isPending) {
      return;
    }

    const nextIsAvailable = !item.isAvailable;

    setAvailabilityMutation.mutate(
      {
        itemId: item.id,
        isAvailable: nextIsAvailable,
      },
      {
        onSuccess: (updatedMenuItem: MenuItem) => {
          const statusMessage = nextIsAvailable
            ? `${updatedMenuItem.name} is available again`
            : `${updatedMenuItem.name} is marked unavailable (86'd)`;
          toastNotification.show(statusMessage);
          onToggleSuccess?.(updatedMenuItem, nextIsAvailable);
        },
        onError: (caughtError: unknown) => {
          const userFriendlyErrorMessage = describeError(caughtError);
          toastNotification.error(userFriendlyErrorMessage);
          onToggleError?.(caughtError);
        },
      },
    );
  }

  const isItemAvailable = item.isAvailable;

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={isItemAvailable}
        aria-label={`Toggle availability for ${item.name}`}
        disabled={isSwitchDisabled}
        onClick={handleToggleAvailability}
        title={
          !userCanToggleAvailability
            ? 'Only receptionists, managers, or admins can toggle item availability'
            : isItemAvailable
              ? `Click to 86 ${item.name} (mark unavailable)`
              : `Click to mark ${item.name} available`
        }
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
          isSwitchDisabled
            ? 'cursor-not-allowed opacity-60 bg-sunken border-line-strong'
            : isItemAvailable
              ? 'cursor-pointer border-emerald-500 bg-emerald-500/20'
              : 'cursor-pointer border-rose-500/40 bg-rose-500/10'
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-3.5 w-3.5 rounded-full shadow-sm transition-transform ${
            isItemAvailable
              ? 'translate-x-[18px] bg-emerald-600 dark:bg-emerald-400'
              : 'translate-x-[2px] bg-rose-500 dark:bg-rose-400'
          }`}
        />
      </button>

      <span
        className={`text-xs font-semibold select-none ${
          isItemAvailable
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400'
        }`}
      >
        {isItemAvailable ? 'Available' : 'Unavailable (86\'d)'}
      </span>
    </div>
  );
}
