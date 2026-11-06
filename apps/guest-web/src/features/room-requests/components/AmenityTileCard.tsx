import React from 'react';
import { AmenityCatalogOption } from '../types';
import { AmenityCounterStepper } from './AmenityCounterStepper';

export interface AmenityTileCardProperties {
  amenityOption: AmenityCatalogOption;
  selectedQuantity: number;
  onQuantityChange: (updatedQuantity: number) => void;
  className?: string;
}

/**
 * Amenity tile matching UI: G06.
 * Renders large emoji icon, bold title, interactive stepper, and active brass/brand border.
 */
export const AmenityTileCard: React.FC<AmenityTileCardProperties> = ({
  amenityOption,
  selectedQuantity,
  onQuantityChange,
  className = '',
}) => {
  const isSelected: boolean = selectedQuantity > 0;

  const handleTileClick = () => {
    if (selectedQuantity === 0) {
      onQuantityChange(1);
    } else {
      onQuantityChange(0);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${amenityOption.name}, currently ${selectedQuantity} selected`}
      onClick={handleTileClick}
      onKeyDown={(keyboardEvent) => {
        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
          keyboardEvent.preventDefault();
          handleTileClick();
        }
      }}
      className={`relative cursor-pointer transition-all duration-200 select-none p-3.5 text-center flex flex-col items-center justify-between min-h-[120px] rounded-2xl shadow-elevation-low overflow-hidden ${
        isSelected
          ? 'border-[1.5px] border-brand bg-brand/5 ring-2 ring-brand/20 shadow-elevation-mid'
          : 'border border-border bg-surface hover:border-brand/40 hover:bg-surface-muted/30'
      } ${className}`}
    >
      {/* Emoji Visual */}
      <div
        aria-hidden="true"
        className="text-3xl pt-1 transform transition-transform duration-200 hover:scale-110"
      >
        {amenityOption.iconEmoji}
      </div>

      {/* Amenity Title */}
      <div className="space-y-0.5 mt-2 mb-2 w-full">
        <h3 className="text-xs font-bold text-text tracking-tight truncate">
          {amenityOption.name}
        </h3>
        <p className="text-[10px] text-text-muted line-clamp-1 font-normal">
          {amenityOption.description}
        </p>
      </div>

      {/* Stepper Controls or Selection Prompt */}
      <div className="w-full flex items-center justify-center pt-1">
        {isSelected ? (
          <AmenityCounterStepper
            amenityName={amenityOption.name}
            currentQuantity={selectedQuantity}
            maximumQuantity={amenityOption.maximumQuantity}
            onQuantityChange={onQuantityChange}
          />
        ) : (
          <span className="text-[11px] font-semibold text-text-muted px-2.5 py-0.5 rounded-full border border-border/60 bg-surface-muted/40">
            Tap to add
          </span>
        )}
      </div>
    </div>
  );
};
