import { useMemo, useState } from 'react';
import { Search, Sparkles, Tag as TagIcon, X } from 'lucide-react';
import { Tag } from '../../../components/ui/Status';
import type { MenuCategory, MenuItem } from '../../../lib/api-types';
import { formatCharge } from '../../../lib/format';
import { AvailabilityToggleSwitch } from './AvailabilityToggleSwitch';

export interface ItemAvailabilityTableProperties {
  categories: MenuCategory[];
  selectedCategoryId?: string | null;
  currency?: string;
  canEdit?: boolean;
  canToggle?: boolean;
  onEditItem?: (targetItem: MenuItem) => void;
}

export type AvailabilityFilterSelection = 'all' | 'available' | 'unavailable';

/**
 * ItemAvailabilityTable — Streamlined Menu Availability management table (`UI: 07`).
 *
 * Provides:
 * - One-tap availability toggling (86ing) via AvailabilityToggleSwitch.
 * - Search query filtering across item names and descriptions.
 * - Category filtering tabs and availability status filters.
 * - Pricing display formatted in the hotel's operational currency.
 * - Real-time synchronization support.
 */
export function ItemAvailabilityTable({
  categories,
  selectedCategoryId = null,
  currency = 'NGN',
  canEdit = false,
  canToggle = true,
  onEditItem,
}: ItemAvailabilityTableProperties) {
  const [searchQueryText, setSearchQueryText] = useState('');
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilterSelection>('all');

  // Flatten all items with their category association for unified filtering
  const allCategorizedItems = useMemo(() => {
    return categories.flatMap((categoryItem) =>
      categoryItem.items.map((menuItem) => ({
        ...menuItem,
        categoryName: categoryItem.name,
        categoryIdentifier: categoryItem.id,
      })),
    );
  }, [categories]);

  // Lookup map to resolve item names for pairing suggestions
  const itemNameLookupMap = useMemo(() => {
    const lookupMap = new Map<string, string>();
    for (const itemRecord of allCategorizedItems) {
      lookupMap.set(itemRecord.id, itemRecord.name);
    }
    return lookupMap;
  }, [allCategorizedItems]);

  // Filter items by category, search text, and availability
  const filteredMenuItems = useMemo(() => {
    const normalizedSearch = searchQueryText.trim().toLowerCase();

    return allCategorizedItems.filter((candidateItem) => {
      // Category filter
      if (
        selectedCategoryId &&
        candidateItem.categoryIdentifier !== selectedCategoryId
      ) {
        return false;
      }

      // Availability filter
      if (availabilityFilter === 'available' && !candidateItem.isAvailable) {
        return false;
      }
      if (availabilityFilter === 'unavailable' && candidateItem.isAvailable) {
        return false;
      }

      // Search query filter
      if (normalizedSearch.length > 0) {
        const matchesName = candidateItem.name
          .toLowerCase()
          .includes(normalizedSearch);
        const matchesDescription = Boolean(
          candidateItem.description?.toLowerCase().includes(normalizedSearch),
        );
        const matchesCategory = candidateItem.categoryName
          .toLowerCase()
          .includes(normalizedSearch);
        return matchesName || matchesDescription || matchesCategory;
      }

      return true;
    });
  }, [
    allCategorizedItems,
    selectedCategoryId,
    availabilityFilter,
    searchQueryText,
  ]);

  const totalItemCount = allCategorizedItems.length;
  const availableItemCount = allCategorizedItems.filter(
    (itemRecord) => itemRecord.isAvailable,
  ).length;
  const unavailableItemCount = totalItemCount - availableItemCount;

  return (
    <div className="space-y-4">
      {/* Filtering and Search Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search input field */}
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3 pointer-events-none"
            strokeWidth={1.75}
          />
          <input
            type="search"
            value={searchQueryText}
            onChange={(changeEvent) =>
              setSearchQueryText(changeEvent.target.value)
            }
            placeholder="Search items by name or description..."
            className="w-full rounded-lg border border-line bg-surface pl-9 pr-8 py-2 text-xs text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {searchQueryText.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQueryText('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink p-0.5 rounded"
              aria-label="Clear search text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Availability status filter buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setAvailabilityFilter('all')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              availabilityFilter === 'all'
                ? 'bg-ink text-surface dark:bg-surface dark:text-ink shadow-sm'
                : 'text-ink-2 hover:bg-sunken hover:text-ink'
            }`}
          >
            All ({totalItemCount})
          </button>
          <button
            type="button"
            onClick={() => setAvailabilityFilter('available')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              availabilityFilter === 'available'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            Available ({availableItemCount})
          </button>
          <button
            type="button"
            onClick={() => setAvailabilityFilter('unavailable')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              availabilityFilter === 'unavailable'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            86'd ({unavailableItemCount})
          </button>
        </div>
      </div>

      {/* Main Item Availability Table */}
      <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-line bg-sunken/60 text-xs font-semibold text-ink-2">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Item
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Price
                </th>
                <th scope="col" className="px-4 py-3">
                  Availability · one tap
                </th>
                {canEdit && (
                  <th scope="col" className="px-4 py-3 text-right">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-line">
              {filteredMenuItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 4 : 3}
                    className="px-4 py-12 text-center text-ink-3"
                  >
                    <p className="font-medium text-sm text-ink mb-1">
                      No matching menu items found
                    </p>
                    <p className="text-xs">
                      {searchQueryText
                        ? `No items match "${searchQueryText}". Try adjusting your search query.`
                        : 'No items currently in this view.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMenuItems.map((menuItemRecord) => {
                  const pairingSuggestions = (menuItemRecord.pairsWith ?? [])
                    .map((pairingItemId) =>
                      itemNameLookupMap.get(pairingItemId),
                    )
                    .filter(Boolean);

                  return (
                    <tr
                      key={menuItemRecord.id}
                      className={`transition-colors hover:bg-sunken/30 ${
                        !menuItemRecord.isAvailable
                          ? 'bg-rose-500/[0.02]'
                          : ''
                      }`}
                    >
                      {/* Item Details */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-3">
                          <div
                            aria-hidden="true"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-sunken text-lg"
                          >
                            🍽️
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`font-semibold ${
                                  menuItemRecord.isAvailable
                                    ? 'text-ink'
                                    : 'text-ink-2 line-through'
                                }`}
                              >
                                {menuItemRecord.name}
                              </span>
                              {!selectedCategoryId && (
                                <span className="rounded bg-sunken px-1.5 py-0.5 text-[11px] font-medium text-ink-3">
                                  {menuItemRecord.categoryName}
                                </span>
                              )}
                              {menuItemRecord.isFeatured && (
                                <Tag>
                                  <Sparkles className="mr-1 h-3 w-3 inline text-accent" />
                                  Featured
                                </Tag>
                              )}
                              {!menuItemRecord.isAvailable && (
                                <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                                  86'd
                                </span>
                              )}
                            </div>

                            {menuItemRecord.description && (
                              <p className="mt-0.5 line-clamp-1 text-xs text-ink-3">
                                {menuItemRecord.description}
                              </p>
                            )}

                            {pairingSuggestions.length > 0 && (
                              <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-3">
                                <TagIcon className="h-3 w-3 shrink-0" />
                                <span>Suggests: {pairingSuggestions.join(', ')}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Item Price */}
                      <td className="px-4 py-3.5 text-right font-medium tabular text-ink">
                        {formatCharge(menuItemRecord.price, currency)}
                      </td>

                      {/* Availability Toggle Switch */}
                      <td className="px-4 py-3.5">
                        <AvailabilityToggleSwitch
                          item={menuItemRecord}
                          disabled={!canToggle}
                        />
                      </td>

                      {/* Item Management Actions */}
                      {canEdit && (
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            aria-label={`Edit ${menuItemRecord.name}`}
                            onClick={() => onEditItem?.(menuItemRecord)}
                            className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:bg-sunken transition-colors"
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
