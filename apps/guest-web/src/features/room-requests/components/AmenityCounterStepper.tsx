import React from 'react';
import { Minus, Plus } from 'lucide-react';

export interface AmenityCounterStepperProperties {
  amenityName: string;
  currentQuantity: number;
  maximumQuantity: number;
  onQuantityChange: (updatedQuantity: number) => void;
  className?: string;
}

/**
 * Interactive quantity selection stepper for in-room amenity tiles.
 */
export const AmenityCounterStepper: React.FC<AmenityCounterStepperProperties> = ({
  amenityName,
  currentQuantity,
  maximumQuantity,
  onQuantityChange,
  className = '',
}) => {
  const handleDecrement = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (currentQuantity > 0) {
      onQuantityChange(currentQuantity - 1);
    }
  };

  const handleIncrement = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (currentQuantity < maximumQuantity) {
      onQuantityChange(currentQuantity + 1);
    }
  };

  return (
    <div
      role="group"
      aria-label={`Quantity selector for ${amenityName}`}
      className={`inline-flex items-center justify-center gap-2 bg-surface-muted/90 rounded-full p-1 border border-border shadow-elevation-low ${className}`}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={currentQuantity <= 0}
        aria-label={`Decrease quantity of ${amenityName}`}
        className="w-7 h-7 rounded-full flex items-center justify-center text-text hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-brand"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <span
        aria-live="polite"
        className="w-5 text-center text-xs font-bold text-text tabular-nums"
      >
        {currentQuantity}
      </span>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={currentQuantity >= maximumQuantity}
        aria-label={`Increase quantity of ${amenityName}`}
        className="w-7 h-7 rounded-full flex items-center justify-center text-text hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-brand"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
