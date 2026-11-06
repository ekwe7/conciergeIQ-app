import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@conciergeiq/ui';
import { ServiceRequestItem } from '@conciergeiq/contracts';
import { retrieveGuestSession } from '../features/guest-session/session-store';
import {
  DEFAULT_AMENITIES_CATALOG,
  AmenityCatalogOption,
  SelectedAmenitiesMap,
  useServiceRequest,
  AmenityTileCard,
  RequestConfirmationCard,
  BackendBlockerNotice,
} from '../features/room-requests';

export interface AmenitiesPageProperties {
  catalogOptions?: AmenityCatalogOption[];
  onBackToMenu?: () => void;
  roomNumberOverride?: string;
  stayIdentifierOverride?: string;
}

/**
 * Mobile In-Room Amenities & Housekeeping Request Interface (UI: G06).
 * Enables guests to request complimentary room amenities with real-time selection steppers,
 * custom instructions, and automatic Mock Service Worker fallback handling.
 */
export const AmenitiesPage: React.FC<AmenitiesPageProperties> = ({
  catalogOptions = DEFAULT_AMENITIES_CATALOG,
  onBackToMenu,
  roomNumberOverride,
  stayIdentifierOverride,
}) => {
  const navigate = useNavigate();
  const currentSession = retrieveGuestSession();

  const effectiveRoomNumber: string =
    roomNumberOverride || currentSession?.roomNumber || '101';
  const effectiveStayIdentifier: string =
    stayIdentifierOverride || currentSession?.stayId || 'stay_default_active';

  const [selectedAmenitiesMap, setSelectedAmenitiesMap] =
    useState<SelectedAmenitiesMap>({});
  const [specialInstructionsText, setSpecialInstructionsText] =
    useState<string>('');

  const {
    isSubmitting,
    lastExecutionResult,
    submitServiceRequest,
    resetServiceRequestState,
  } = useServiceRequest();

  const handleBackNavigation = useCallback(() => {
    if (onBackToMenu) {
      onBackToMenu();
    } else {
      navigate('/menu');
    }
  }, [onBackToMenu, navigate]);

  const handleQuantityUpdate = useCallback(
    (amenityIdentifier: string, updatedQuantity: number) => {
      setSelectedAmenitiesMap((previousMap) => {
        const nextMap: SelectedAmenitiesMap = { ...previousMap };
        if (updatedQuantity <= 0) {
          delete nextMap[amenityIdentifier];
        } else {
          nextMap[amenityIdentifier] = updatedQuantity;
        }
        return nextMap;
      });
    },
    []
  );

  const totalSelectedItemsCount: number = useMemo(() => {
    return Object.values(selectedAmenitiesMap).reduce(
      (runningTotal, currentQuantity) => runningTotal + currentQuantity,
      0
    );
  }, [selectedAmenitiesMap]);

  const handleSubmitRequest = async () => {
    if (totalSelectedItemsCount === 0 && specialInstructionsText.trim().length === 0) {
      return;
    }

    const compiledItemsList: ServiceRequestItem[] = [];

    catalogOptions.forEach((catalogOption) => {
      const selectedQuantity = selectedAmenitiesMap[catalogOption.identifier] ?? 0;
      if (selectedQuantity > 0) {
        compiledItemsList.push({
          itemId: catalogOption.identifier,
          name: catalogOption.name,
          quantity: selectedQuantity,
        });
      }
    });

    // If guest entered custom text without selecting tiles, create a custom amenity entry
    if (compiledItemsList.length === 0 && specialInstructionsText.trim().length > 0) {
      compiledItemsList.push({
        itemId: 'amenity_custom_note',
        name: 'Special Request',
        quantity: 1,
      });
    }

    await submitServiceRequest({
      roomNumber: effectiveRoomNumber,
      stayId: effectiveStayIdentifier,
      category: 'AMENITIES',
      items: compiledItemsList,
      notes: specialInstructionsText.trim() || undefined,
      specialInstructions: specialInstructionsText.trim() || undefined,
    });
  };

  const handleResetForNewRequest = () => {
    setSelectedAmenitiesMap({});
    setSpecialInstructionsText('');
    resetServiceRequestState();
  };

  // If a request has been submitted and confirmed, show the confirmation screen
  if (lastExecutionResult && lastExecutionResult.isSuccessful) {
    return (
      <div className="min-h-full flex flex-col justify-between p-4 max-w-lg mx-auto w-full space-y-4 pb-24">
        <RequestConfirmationCard
          executionResult={lastExecutionResult}
          onResetOrNewRequest={handleResetForNewRequest}
          onReturnToMenu={handleBackNavigation}
        />
      </div>
    );
  }

  const actionButtonLabel: string =
    totalSelectedItemsCount === 0
      ? 'Select items to request'
      : totalSelectedItemsCount === 1
      ? 'Request 1 item'
      : `Request ${totalSelectedItemsCount} items`;

  return (
    <div className="min-h-full flex flex-col justify-between pb-28">
      {/* Polite Screen Reader Live Region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {totalSelectedItemsCount > 0
          ? `${totalSelectedItemsCount} items currently selected for Room ${effectiveRoomNumber}`
          : 'No amenities selected'}
      </div>

      {/* Top Header Matching UI: G06 */}
      <header className="bg-surface border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-elevation-low">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackNavigation}
            aria-label="Back to In-Room Menu"
            className="w-8 h-8 rounded-full flex items-center justify-center text-text hover:bg-surface-muted transition-colors focus:outline-none focus:ring-2 focus:ring-brand -ml-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-text tracking-tight">
            Amenities
          </h1>
        </div>

        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand border border-brand/20 shadow-sm">
          Room {effectiveRoomNumber}
        </span>
      </header>

      {/* Main Content Scroll Area */}
      <main className="p-4 space-y-4 max-w-lg mx-auto w-full flex-1">
        {/* Subtitle Reassurance */}
        <div className="space-y-1">
          <p className="text-xs text-text-muted leading-relaxed font-normal">
            Free of charge. Housekeeping usually responds within 15 minutes.
          </p>
        </div>

        {/* Backend Dependency Status Notice */}
        <BackendBlockerNotice isCompact={true} />

        {/* Amenities 2-Column Grid Matching UI: G06 */}
        <div
          role="region"
          aria-label="Complimentary amenity options"
          className="grid grid-cols-2 gap-2.5 pt-1"
        >
          {catalogOptions.map((catalogOption) => {
            const currentQuantity =
              selectedAmenitiesMap[catalogOption.identifier] ?? 0;
            return (
              <AmenityTileCard
                key={catalogOption.identifier}
                amenityOption={catalogOption}
                selectedQuantity={currentQuantity}
                onQuantityChange={(updatedQuantity) =>
                  handleQuantityUpdate(catalogOption.identifier, updatedQuantity)
                }
              />
            );
          })}
        </div>

        {/* Custom Textarea Instruction Field Matching UI: G06 */}
        <div className="pt-2 space-y-1.5">
          <label
            htmlFor="amenity-special-instructions-input"
            className="block text-xs font-bold text-text"
          >
            Anything else?
          </label>
          <div className="relative">
            <textarea
              id="amenity-special-instructions-input"
              rows={2}
              value={specialInstructionsText}
              onChange={(changeEvent) =>
                setSpecialInstructionsText(changeEvent.target.value)
              }
              placeholder="e.g. hypoallergenic pillow, extra coat hangers"
              className="w-full text-xs p-3 rounded-xl border border-border bg-surface text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors resize-none shadow-elevation-low"
            />
          </div>
        </div>
      </main>

      {/* Sticky Bottom Action Footer Matching UI: G06 */}
      <footer className="fixed bottom-0 left-0 right-0 p-3 bg-surface/95 backdrop-blur-md border-t border-border z-30 shadow-elevation-mid">
        <div className="max-w-lg mx-auto">
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmitRequest}
            disabled={
              isSubmitting ||
              (totalSelectedItemsCount === 0 && specialInstructionsText.trim().length === 0)
            }
            className="w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 rounded-xl shadow-elevation-low bg-brand hover:bg-brand-dark text-white disabled:opacity-50 transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending to Housekeeping...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{actionButtonLabel}</span>
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
};
