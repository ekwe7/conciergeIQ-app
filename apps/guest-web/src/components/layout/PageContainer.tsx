import React from 'react';

export interface PageContainerProperties {
  children: React.ReactNode;
  className?: string;
  applySafeAreaPadding?: boolean;
}

/**
 * Mobile-first application container component.
 * Constrains viewport width to a smartphone profile (max 448px / max-w-md),
 * centers on larger desktop screens, and accommodates device safe-area insets.
 */
export const PageContainer: React.FC<PageContainerProperties> = ({
  children,
  className = '',
  applySafeAreaPadding = true,
}) => {
  const safeAreaClassNames = applySafeAreaPadding
    ? 'padding-bottom-safe-area'
    : '';

  return (
    <div
      data-testid="guest-page-container"
      className={`w-full max-w-md mx-auto min-h-screen min-height-mobile-viewport bg-surface flex flex-col relative shadow-elevation-high ${safeAreaClassNames} ${className}`}
    >
      {children}
    </div>
  );
};
