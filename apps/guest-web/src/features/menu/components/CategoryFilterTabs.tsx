import React from 'react';

export interface CategoryFilterTabsProperties {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (selectedCategory: string) => void;
  className?: string;
}

/**
 * Mobile-first horizontal scrollable category filter tabs matching prototype G02.
 * Leverages native CSS `scroll-snap-type: x mandatory` for fluid thumb-swiping
 * with zero third-party dependencies.
 * Full WAI-ARIA tablist accessibility support.
 */
export const CategoryFilterTabs: React.FC<CategoryFilterTabsProperties> = ({
  categories,
  activeCategory,
  onSelectCategory,
  className = '',
}) => {
  return (
    <nav
      role="tablist"
      aria-label="Menu category selection"
      className={`w-full overflow-x-auto no-scrollbar py-2.5 px-4 flex items-center gap-2 border-b border-border bg-surface/95 backdrop-blur-md sticky top-0 z-10 select-none ${className}`}
      style={{
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {categories.map((categoryName) => {
        const isSelected = activeCategory === categoryName;
        const normalizedTabIdentifier = `category-tab-${categoryName.toLowerCase().replace(/\s+/g, '-')}`;
        const associatedPanelIdentifier = `category-panel-${categoryName.toLowerCase().replace(/\s+/g, '-')}`;

        return (
          <button
            key={categoryName}
            id={normalizedTabIdentifier}
            role="tab"
            type="button"
            aria-selected={isSelected}
            aria-controls={associatedPanelIdentifier}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelectCategory(categoryName)}
            style={{
              scrollSnapAlign: 'start',
            }}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
              isSelected
                ? 'bg-slate-900 text-white shadow-elevation-low'
                : 'bg-surface-muted text-text-muted hover:text-text hover:bg-border/60 active:scale-95'
            }`}
          >
            {categoryName}
          </button>
        );
      })}
    </nav>
  );
};
