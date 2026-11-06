import React from 'react';
import { CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { Button } from '@conciergeiq/ui';
import { ServiceRequestExecutionResult } from '../types';

export interface RequestConfirmationCardProperties {
  executionResult: ServiceRequestExecutionResult;
  onResetOrNewRequest: () => void;
  onReturnToMenu?: () => void;
  className?: string;
}

/**
 * Confirmation card displayed after successful submission of an amenity or service request.
 * Highlights the estimated delivery time, confirmed items, and room number.
 */
export const RequestConfirmationCard: React.FC<RequestConfirmationCardProperties> = ({
  executionResult,
  onResetOrNewRequest,
  onReturnToMenu,
  className = '',
}) => {
  return (
    <div
      role="region"
      aria-label="Service request confirmed"
      className={`p-6 text-center bg-surface border border-border shadow-elevation-mid rounded-2xl space-y-5 overflow-hidden ${className}`}
    >
      {/* Success Badge Icon */}
      <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shadow-elevation-low">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xl font-serif font-bold text-text tracking-tight">
          Request Received
        </h2>
        <p className="text-xs text-text-muted leading-relaxed max-w-xs mx-auto font-normal">
          Housekeeping staff for Room {executionResult.roomNumber} have received your ticket.
        </p>
      </div>

      {/* Estimated Delivery Time Pill */}
      <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold shadow-elevation-low">
        <Clock className="w-4 h-4 text-amber-700" />
        <span>Estimated delivery: within {executionResult.estimatedDeliveryMinutes} minutes</span>
      </div>

      {/* Confirmed Items Breakdown */}
      <div className="text-left bg-surface-muted/50 rounded-xl p-3.5 border border-border/80 space-y-2 text-xs">
        <div className="flex items-center justify-between text-text-muted font-bold tracking-wider text-[10px] uppercase">
          <span>Requested Items</span>
          <span>Room {executionResult.roomNumber}</span>
        </div>

        <ul className="space-y-1.5 list-none p-0 m-0 text-text">
          {executionResult.confirmedItems.map((itemRecord) => (
            <li
              key={itemRecord.itemId}
              className="flex justify-between items-center text-xs"
            >
              <span className="font-medium text-text">{itemRecord.name}</span>
              <span className="font-bold text-text-muted bg-surface px-2 py-0.5 rounded-md border border-border/60">
                × {itemRecord.quantity}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Mock Fallback Indicator Notice */}
      {executionResult.isMockFallbackActivated && (
        <div className="text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200/80 rounded-lg p-2.5 flex items-start gap-2 text-left">
          <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            <strong>Offline Mock Response:</strong> Simulated ticket confirmation. The live backend route is pending backend implementation.
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2.5 pt-2">
        <Button
          type="button"
          variant="primary"
          onClick={onReturnToMenu ?? onResetOrNewRequest}
          className="w-full"
        >
          Return to In-Room Menu
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onResetOrNewRequest}
          className="w-full"
        >
          Ask for Something Else
        </Button>
      </div>
    </div>
  );
};
