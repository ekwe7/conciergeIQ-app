import React from 'react';

/**
 * Mobile-first skeleton loader matching prototype G02 card layout
 * shown while menu categories and items are loading over the network.
 */
export const MenuSkeleton: React.FC = () => {
  return (
    <div
      data-testid="menu-loading-skeleton"
      className="p-4 space-y-3 w-full max-w-md mx-auto animate-pulse"
    >
      {/* Search Bar Skeleton */}
      <div className="h-11 rounded-xl bg-surface-muted border border-border" />

      {/* Category Pills Skeleton */}
      <div className="flex gap-2 overflow-hidden py-1">
        <div className="h-8 w-16 rounded-full bg-surface-muted" />
        <div className="h-8 w-20 rounded-full bg-surface-muted" />
        <div className="h-8 w-24 rounded-full bg-surface-muted" />
        <div className="h-8 w-20 rounded-full bg-surface-muted" />
      </div>

      {/* Item Cards Skeleton */}
      {[1, 2, 3, 4].map((skeletonIndex) => (
        <div
          key={skeletonIndex}
          className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3.5 flex-1">
            <div className="w-16 h-16 rounded-xl bg-surface-muted shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-3/4 rounded bg-surface-muted" />
              <div className="h-3 w-5/6 rounded bg-surface-muted" />
              <div className="h-3 w-1/3 rounded bg-surface-muted" />
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-surface-muted shrink-0" />
        </div>
      ))}
    </div>
  );
};
