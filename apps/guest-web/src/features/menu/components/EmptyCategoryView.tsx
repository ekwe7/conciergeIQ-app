import React from 'react';
import { UtensilsCrossed, RefreshCw } from 'lucide-react';

export interface EmptyCategoryViewProperties {
  categoryName: string;
  searchQuery?: string;
  onResetFilter?: () => void;
}

/**
 * Empty category state view rendered when no menu items match
 * the currently selected category or search query.
 */
export const EmptyCategoryView: React.FC<EmptyCategoryViewProperties> = ({
  categoryName,
  searchQuery,
  onResetFilter,
}) => {
  return (
    <div
      data-testid="empty-category-view"
      className="p-8 flex flex-col items-center justify-center text-center space-y-3 min-h-[35vh] max-w-sm mx-auto"
    >
      <div className="w-14 h-14 rounded-full bg-surface-muted text-text-muted flex items-center justify-center">
        <UtensilsCrossed className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h4 className="text-base font-bold text-text">No items found</h4>
        <p className="text-xs text-text-muted leading-relaxed">
          {searchQuery && searchQuery.trim().length > 0
            ? `No menu items matching "${searchQuery}" in ${categoryName}.`
            : `There are currently no items available in ${categoryName}.`}
        </p>
      </div>

      {onResetFilter && (
        <button
          type="button"
          onClick={onResetFilter}
          className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-surface-muted hover:bg-border text-text transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-brand" />
          <span>View All Items</span>
        </button>
      )}
    </div>
  );
};
