import React from 'react';
import { Card, Button } from '@conciergeiq/ui';
import { AlertCircle, PhoneCall } from 'lucide-react';

export interface OrderCancellationBannerProperties {
  cancellationReason?: string | null;
  onContactFrontDesk?: () => void;
  className?: string;
}

/**
 * Visual cancellation alert banner displaying server-provided rejection reasons
 * and assistance guidance when an in-room dining order cannot be fulfilled.
 */
export const OrderCancellationBanner: React.FC<OrderCancellationBannerProperties> = ({
  cancellationReason,
  onContactFrontDesk,
  className = '',
}) => {
  const resolvedReasonText: string =
    cancellationReason && cancellationReason.trim().length > 0
      ? cancellationReason.trim()
      : 'The kitchen was unable to fulfill your request at this time. Please contact the front desk or place an alternate order.';

  const handleAssistanceClick = () => {
    if (onContactFrontDesk) {
      onContactFrontDesk();
    } else if (typeof window !== 'undefined') {
      window.location.href = 'tel:0';
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`border border-status-danger/30 bg-status-danger/5 p-4.5 rounded-xl shadow-elevation-low space-y-3 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-status-danger/15 text-status-danger flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5" aria-hidden="true" />
        </div>

        <div className="space-y-1 flex-1">
          <h3 className="text-sm font-bold text-status-danger tracking-tight">
            Order Cancelled
          </h3>
          <p className="text-xs text-text-muted leading-relaxed font-normal">
            {resolvedReasonText}
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-status-danger/10 flex items-center justify-between">
        <span className="text-[11px] text-text-muted">
          Need immediate assistance?
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAssistanceClick}
          className="border-status-danger/30 text-status-danger hover:bg-status-danger/10 flex items-center gap-1.5 text-xs py-1"
        >
          <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Call Desk</span>
        </Button>
      </div>
    </div>
  );
};
