/**
 * CreateRoomModal — Modal dialog for adding one or more rooms to the hotel
 * inventory. Supports two modes: adding a single room by number, or a
 * contiguous numeric range (e.g. 101–120) on the same floor.
 *
 * Uses the `useCreateRooms` mutation which calls `POST /api/v1/rooms` for a
 * single room or `POST /api/v1/rooms/bulk` for a range.
 *
 * Schema validation (CreateRoomSchema):
 *   - roomNumberFrom: non-empty string
 *   - roomNumberTo: optional string (range mode only)
 *   - floorNumber: integer 0–200
 *   - mode: 'one' | 'range'
 */

import { useEffect, useMemo, type FormEvent } from 'react';
import { Button } from '../../../components/ui/Button';
import { Field, FormError, Input } from '../../../components/ui/Field';
import { Overlay } from '../../../components/ui/Overlay';
import { Segmented } from '../../../components/ui/Segmented';
import { useToast } from '../../../components/ui/Toast';
import { describeError } from '../../../lib/error-handler';
import { useCreateRooms, type RoomInput } from '../api';
import { useState } from 'react';

/** Minimum floor number accepted by the API. */
const FLOOR_NUMBER_MINIMUM = 0;

/** Maximum floor number accepted by the API (a reasonable ceiling). */
const FLOOR_NUMBER_MAXIMUM = 200;

/** Maximum number of rooms in a single bulk creation request. */
const ROOM_RANGE_SIZE_LIMIT = 500;

/**
 * Expands a "first room / last room" pair into the full list of room number
 * strings in between.
 *
 * Returns `null` when the range is invalid (non-numeric, reversed, or too
 * large). Returns a single-element array when `lastRoomNumber` is omitted,
 * empty, or equal to `firstRoomNumber`.
 */
export function expandRoomNumberRange(
  firstRoomNumber: string,
  lastRoomNumber: string,
): string[] | null {
  const trimmedFirst = firstRoomNumber.trim();
  const trimmedLast = lastRoomNumber.trim();

  if (!trimmedFirst) return null;
  if (!trimmedLast || trimmedLast === trimmedFirst) return [trimmedFirst];
  if (!/^\d+$/.test(trimmedFirst) || !/^\d+$/.test(trimmedLast)) return null;

  const numericFirst = Number(trimmedFirst);
  const numericLast = Number(trimmedLast);

  if (numericLast < numericFirst || numericLast - numericFirst >= ROOM_RANGE_SIZE_LIMIT) {
    return null;
  }

  return Array.from({ length: numericLast - numericFirst + 1 }, (_, index) =>
    String(numericFirst + index).padStart(trimmedFirst.length, '0'),
  );
}

/**
 * Returns true when `rawFloor` is a valid floor string: digits only,
 * within the 0–200 range the API accepts.
 */
export function isValidFloorInput(rawFloor: string): boolean {
  if (!/^\d{1,3}$/.test(rawFloor)) return false;
  const floorNumber = Number(rawFloor);
  return floorNumber >= FLOOR_NUMBER_MINIMUM && floorNumber <= FLOOR_NUMBER_MAXIMUM;
}

export interface CreateRoomModalProps {
  /** Whether the dialog is currently visible. */
  isOpen: boolean;
  /** Called when the user dismisses the dialog or a room is successfully created. */
  onClose: () => void;
}

/**
 * Controlled modal that lets hotel admins create a single room or a floor
 * range in one submission. Each created room immediately appears in the grid
 * because `useCreateRooms` invalidates the rooms query on success.
 */
export function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const createRooms = useCreateRooms();
  const toast = useToast();

  const [creationMode, setCreationMode] = useState<'one' | 'range'>('range');
  const [firstRoomNumber, setFirstRoomNumber] = useState('');
  const [lastRoomNumber, setLastRoomNumber] = useState('');
  const [rawFloorInput, setRawFloorInput] = useState('1');

  /** Reset all fields and mutation state whenever the modal opens. */
  useEffect(() => {
    if (!isOpen) return;
    setCreationMode('range');
    setFirstRoomNumber('');
    setLastRoomNumber('');
    setRawFloorInput('1');
    createRooms.reset();
  }, [isOpen]);

  const expandedRoomNumbers = useMemo(
    () => expandRoomNumberRange(firstRoomNumber, creationMode === 'range' ? lastRoomNumber : ''),
    [firstRoomNumber, lastRoomNumber, creationMode],
  );

  const floorInputIsValid = isValidFloorInput(rawFloorInput);

  const rangeValidationError =
    creationMode === 'range' && firstRoomNumber && lastRoomNumber && !expandedRoomNumbers
      ? 'Use numbers only, with the last at or above the first (up to 500 rooms).'
      : null;

  const submitIsDisabled = !expandedRoomNumbers || !floorInputIsValid;

  if (!isOpen) return null;

  function handleFormSubmit(event: FormEvent) {
    event.preventDefault();
    if (!expandedRoomNumbers || !floorInputIsValid) return;

    const roomsToCreate: RoomInput[] = expandedRoomNumbers.map((roomNumber) => ({
      number: roomNumber,
      floor: Number(rawFloorInput),
    }));

    createRooms.mutate(roomsToCreate, {
      onSuccess: (createdRooms) => {
        const successMessage =
          createdRooms.length === 1
            ? `Room ${createdRooms[0].number} added`
            : `${createdRooms.length} rooms added`;
        toast.show(successMessage);
        onClose();
      },
    });
  }

  const submitButtonLabel =
    expandedRoomNumbers && expandedRoomNumbers.length > 1
      ? `Add ${expandedRoomNumbers.length} rooms`
      : 'Add room';

  return (
    <Overlay
      open
      onClose={onClose}
      width="sm"
      title="Add rooms"
      description="Each new room gets its own QR code."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            form="create-room-form"
            pending={createRooms.isPending}
            disabled={submitIsDisabled}
          >
            {submitButtonLabel}
          </Button>
        </>
      }
    >
      <form id="create-room-form" onSubmit={handleFormSubmit} className="space-y-4">
        <Segmented
          label="How many"
          value={creationMode}
          onChange={setCreationMode}
          options={[
            { value: 'range', label: 'A range' },
            { value: 'one', label: 'One room' },
          ]}
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label={creationMode === 'range' ? 'First room' : 'Room number'}>
            <Input
              value={firstRoomNumber}
              maxLength={10}
              onChange={(event) => setFirstRoomNumber(event.target.value)}
              placeholder="101"
              data-autofocus
            />
          </Field>
          {creationMode === 'range' && (
            <Field label="Last room">
              <Input
                value={lastRoomNumber}
                maxLength={10}
                onChange={(event) => setLastRoomNumber(event.target.value)}
                placeholder="120"
              />
            </Field>
          )}
        </div>

        <Field
          label="Floor"
          error={
            rawFloorInput && !floorInputIsValid
              ? `Enter a floor between ${FLOOR_NUMBER_MINIMUM} and ${FLOOR_NUMBER_MAXIMUM}.`
              : null
          }
        >
          <Input
            inputMode="numeric"
            value={rawFloorInput}
            onChange={(event) => setRawFloorInput(event.target.value.replace(/\D/g, ''))}
            className="max-w-[8rem]"
          />
        </Field>

        {rangeValidationError && (
          <p className="text-xs text-danger">{rangeValidationError}</p>
        )}

        {expandedRoomNumbers && expandedRoomNumbers.length > 1 && (
          <p className="text-xs text-ink-3">
            Rooms {expandedRoomNumbers[0]} to{' '}
            {expandedRoomNumbers[expandedRoomNumbers.length - 1]} on floor{' '}
            {rawFloorInput || '–'}.
          </p>
        )}

        <FormError>
          {createRooms.error ? describeError(createRooms.error) : null}
        </FormError>
      </form>
    </Overlay>
  );
}
