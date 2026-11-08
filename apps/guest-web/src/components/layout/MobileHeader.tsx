import React from 'react';
import { Hotel, DoorClosed, Sparkles } from 'lucide-react';
import { Badge } from '@conciergeiq/ui';

export interface MobileHeaderProperties {
  hotelTitle?: string;
  roomNumber?: string;
  guestName?: string;
  stayStatus?: string;
}

/**
 * Mobile navigation and identity header.
 * Displays the hotel name, guest room badge, and stay status indicator
 * while respecting mobile top notch safe areas.
 */
export const MobileHeader: React.FC<MobileHeaderProperties> = ({
  hotelTitle = 'The Lagos Grand Hotel & Suites',
  roomNumber = '402',
  guestName = 'Valued Guest',
  stayStatus = 'Active Stay',
}) => {
  return (
    <header
      data-testid="guest-mobile-header"
      className="sticky top-0 z-30 w-full bg-surface/95 backdrop-blur-md border-b border-border shadow-elevation-low padding-top-safe-area transition-colors print:hidden"
    >
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        {/* Hotel Identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-md bg-brand text-white flex items-center justify-center shrink-0 shadow-elevation-low">
            <Hotel className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-text truncate leading-tight">
              {hotelTitle}
            </h1>
            <p className="text-xs text-text-muted truncate">
              {guestName}
            </p>
          </div>
        </div>

        {/* Room Badge and Status */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            data-testid="guest-room-badge"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 border border-brand/20 text-brand font-semibold text-xs"
          >
            <DoorClosed className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Room {roomNumber}</span>
          </div>

          <Badge variant="success" className="hidden compact:inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" aria-hidden="true" />
            <span>{stayStatus}</span>
          </Badge>
        </div>
      </div>
    </header>
  );
};
