import { useEffect, useState, type FormEvent } from 'react';
import { DoorClosed, QrCode } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Field, FormError, Input, Select } from '../../../components/ui/Field';
import { Overlay } from '../../../components/ui/Overlay';
import { useToast } from '../../../components/ui/Toast';
import type { Room, Stay } from '../../../lib/api-types';
import { describeError } from '../../../lib/error-handler';
import { defaultExpectedCheckOutDateTime, useCheckIn } from '../api';

export interface CheckInModalProperties {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-selected room when opened from a specific room card or table row. */
  preselectedRoom?: Room | null;
  /** Available vacant rooms for the room picker selection dropdown. */
  availableRooms?: Room[];
  onCheckInSuccess?: (createdStay: Stay) => void;
}

export function CheckInModal({
  isOpen,
  onClose,
  preselectedRoom,
  availableRooms = [],
  onCheckInSuccess,
}: CheckInModalProperties) {
  const [selectedRoomIdentifier, setSelectedRoomIdentifier] = useState<string>('');
  const [guestFullName, setGuestFullName] = useState<string>('');
  const [guestPhoneNumber, setGuestPhoneNumber] = useState<string>('');
  const [expectedCheckOutDateTimeValue, setExpectedCheckOutDateTimeValue] =
    useState<string>(defaultExpectedCheckOutDateTime);

  const checkInMutation = useCheckIn();
  const toastNotification = useToast();

  useEffect(() => {
    if (isOpen) {
      if (preselectedRoom) {
        setSelectedRoomIdentifier(preselectedRoom.id);
      } else if (availableRooms.length > 0) {
        setSelectedRoomIdentifier(availableRooms[0].id);
      } else {
        setSelectedRoomIdentifier('');
      }
      setGuestFullName('');
      setGuestPhoneNumber('');
      setExpectedCheckOutDateTimeValue(defaultExpectedCheckOutDateTime());
      checkInMutation.reset();
    }
  }, [isOpen, preselectedRoom?.id]);

  if (!isOpen) {
    return null;
  }

  const currentlyChosenRoom =
    preselectedRoom ??
    availableRooms.find(
      (candidateRoom) => candidateRoom.id === selectedRoomIdentifier,
    ) ??
    null;

  const parsedDepartureDate = expectedCheckOutDateTimeValue
    ? new Date(expectedCheckOutDateTimeValue)
    : null;

  const departureDateValidationError =
    parsedDepartureDate && parsedDepartureDate.getTime() <= Date.now()
      ? 'Departure must be in the future.'
      : null;

  const isFormValidToSubmit =
    Boolean(currentlyChosenRoom) &&
    guestFullName.trim().length > 0 &&
    Boolean(parsedDepartureDate) &&
    !departureDateValidationError &&
    !checkInMutation.isPending;

  function handleFormSubmission(submissionEvent: FormEvent) {
    submissionEvent.preventDefault();

    if (!currentlyChosenRoom || !isFormValidToSubmit || !parsedDepartureDate) {
      return;
    }

    checkInMutation.mutate(
      {
        roomId: currentlyChosenRoom.id,
        checkInPayload: {
          guestName: guestFullName.trim(),
          guestPhone: guestPhoneNumber.trim() || undefined,
          expectedCheckOutAt: parsedDepartureDate.toISOString(),
        },
      },
      {
        onSuccess: (newlyCreatedStay: Stay) => {
          toastNotification.show(
            `${newlyCreatedStay.guestName} checked in to Room ${newlyCreatedStay.roomNumber}`,
          );
          onCheckInSuccess?.(newlyCreatedStay);
          onClose();
        },
      },
    );
  }

  const roomDisplayTitle = currentlyChosenRoom
    ? `Check in · Room ${currentlyChosenRoom.number}`
    : 'Check in guest';

  return (
    <Overlay
      open={isOpen}
      onClose={onClose}
      width="sm"
      title={roomDisplayTitle}
      description="Starts a stay and activates the room's QR code"
      footer={
        <>
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="reception-check-in-form"
            pending={checkInMutation.isPending}
            disabled={!isFormValidToSubmit}
          >
            Check in
          </Button>
        </>
      }
    >
      <form
        id="reception-check-in-form"
        onSubmit={handleFormSubmission}
        className="space-y-4"
      >
        {/* Room Picker Selector if room is not fixed */}
        {!preselectedRoom && (
          <Field label="Select Room">
            <Select
              aria-label="Select Room"
              value={selectedRoomIdentifier}
              onChange={(changeEvent) =>
                setSelectedRoomIdentifier(changeEvent.target.value)
              }
            >
              {availableRooms.length === 0 ? (
                <option value="" disabled>
                  No vacant rooms available
                </option>
              ) : (
                availableRooms.map((vacantRoomOption) => (
                  <option
                    key={vacantRoomOption.id}
                    value={vacantRoomOption.id}
                  >
                    Room {vacantRoomOption.number} (Floor {vacantRoomOption.floor})
                  </option>
                ))
              )}
            </Select>
          </Field>
        )}

        {/* Guest Full Name */}
        <Field label="Guest name">
          <Input
            aria-label="Guest name"
            placeholder="e.g. Mrs. Funke Adebayo"
            value={guestFullName}
            maxLength={120}
            onChange={(inputChangeEvent) =>
              setGuestFullName(inputChangeEvent.target.value)
            }
            data-autofocus
          />
        </Field>

        {/* Guest Phone Number */}
        <Field label="Phone (for escalations, optional)" optional>
          <Input
            type="tel"
            aria-label="Phone (for escalations, optional)"
            placeholder="+234 …"
            value={guestPhoneNumber}
            maxLength={30}
            onChange={(inputChangeEvent) =>
              setGuestPhoneNumber(inputChangeEvent.target.value)
            }
          />
        </Field>

        {/* Expected Departure Date */}
        <Field
          label="Expected departure"
          error={departureDateValidationError}
        >
          <Input
            type="datetime-local"
            aria-label="Expected departure"
            value={expectedCheckOutDateTimeValue}
            onChange={(inputChangeEvent) =>
              setExpectedCheckOutDateTimeValue(inputChangeEvent.target.value)
            }
          />
        </Field>

        {/* Information Callout Banner */}
        {currentlyChosenRoom && (
          <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
            <QrCode className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={2} />
            <span className="text-xs leading-relaxed">
              Room {currentlyChosenRoom.number}&apos;s QR code becomes active as
              soon as you confirm check-in.
            </span>
          </div>
        )}

        <FormError>
          {checkInMutation.error
            ? describeError(checkInMutation.error)
            : null}
        </FormError>
      </form>
    </Overlay>
  );
}
