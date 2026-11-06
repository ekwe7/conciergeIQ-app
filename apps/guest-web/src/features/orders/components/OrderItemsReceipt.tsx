import React, { useState } from 'react';
import { OrderLineItem } from '@conciergeiq/contracts';
import { Card } from '@conciergeiq/ui';
import { formatMoney } from '@conciergeiq/utils';
import { ChevronDown, ChevronUp, Receipt } from 'lucide-react';

export interface OrderItemsReceiptProperties {
  orderLineItems: OrderLineItem[];
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  currencyCode?: string;
  className?: string;
}

/**
 * Receipt component displaying ordered dishes, customized kitchen notes,
 * subtotal breakdowns, and final server-confirmed total billing.
 */
export const OrderItemsReceipt: React.FC<OrderItemsReceiptProperties> = ({
  orderLineItems,
  subtotalMinor,
  taxMinor,
  totalMinor,
  currencyCode = 'USD',
  className = '',
}) => {
  const [isReceiptExpanded, setIsReceiptExpanded] = useState<boolean>(true);

  const totalItemCount: number = orderLineItems.reduce(
    (accumulatedCount, currentLineItem) =>
      accumulatedCount + currentLineItem.quantity,
    0
  );

  const formattedTotalBilledAmount: string = formatMoney(
    totalMinor,
    currencyCode
  );
  const formattedSubtotalAmount: string = formatMoney(
    subtotalMinor,
    currencyCode
  );
  const formattedTaxAmount: string = formatMoney(taxMinor, currencyCode);

  const itemsSummarySentence: string = orderLineItems
    .map(
      (lineItem) =>
        `${lineItem.name}${lineItem.quantity > 1 ? ` ×${lineItem.quantity}` : ''}`
    )
    .join(' · ');

  return (
    <Card
      className={`p-4.5 bg-surface border-border shadow-elevation-low space-y-3.5 ${className}`}
    >
      {/* Header bar with toggle */}
      <button
        type="button"
        onClick={() => setIsReceiptExpanded(!isReceiptExpanded)}
        className="w-full flex items-center justify-between text-left focus:outline-none group"
        aria-expanded={isReceiptExpanded}
      >
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-brand" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider text-text">
            Order Receipt
          </span>
          <span className="text-xs text-text-muted">
            ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-text">
            {formattedTotalBilledAmount}
          </span>
          <div className="p-1 text-text-muted group-hover:text-text rounded-full transition-colors">
            {isReceiptExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </button>

      {/* Compact summary line when collapsed */}
      {!isReceiptExpanded && (
        <p className="text-xs text-text-muted truncate mt-1">
          {itemsSummarySentence}
        </p>
      )}

      {/* Expanded item details list */}
      {isReceiptExpanded && (
        <div className="space-y-3 pt-2 border-t border-border/80">
          <div className="divide-y divide-border/60">
            {orderLineItems.map((lineItem) => {
              const itemTotalFormatted: string = formatMoney(
                lineItem.totalMinor,
                currencyCode
              );

              const specialInstructionsText: string | undefined =
                lineItem.specialInstructions;

              return (
                <div
                  key={lineItem.itemId}
                  className="py-2.5 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 font-medium text-text">
                      <span className="text-brand font-bold shrink-0">
                        {lineItem.quantity}×
                      </span>
                      <span className="truncate">{lineItem.name}</span>
                    </div>

                    {specialInstructionsText &&
                      specialInstructionsText.trim().length > 0 && (
                        <p className="text-[11px] text-text-muted italic pl-5">
                          &ldquo;{specialInstructionsText.trim()}&rdquo;
                        </p>
                      )}
                  </div>

                  <span className="font-semibold text-text tabular-nums shrink-0">
                    {itemTotalFormatted}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Pricing calculations */}
          <div className="pt-2 border-t border-border/80 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-text-muted">
              <span>Subtotal</span>
              <span className="tabular-nums">{formattedSubtotalAmount}</span>
            </div>

            {taxMinor > 0 && (
              <div className="flex justify-between items-center text-text-muted">
                <span>Estimated Tax</span>
                <span className="tabular-nums">{formattedTaxAmount}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm font-bold text-text pt-1.5 border-t border-dashed border-border">
              <span>Total Billed to Room</span>
              <span className="text-brand tabular-nums">
                {formattedTotalBilledAmount}
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
