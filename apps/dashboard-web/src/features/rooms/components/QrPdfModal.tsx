/**
 * QrPdfModal — Modal dialog that lets hotel admins download a printable PDF
 * tent-card sheet for a subset of rooms (or all rooms) from the backend.
 *
 * The modal streams `GET /api/v1/rooms/qr.pdf` via `api.getBlob()` and hands
 * the binary blob to `saveBlob()` which triggers a browser file-save dialog.
 * The floor selector allows staff to print one floor at a time, reducing ink
 * and making it faster to replace a single damaged card.
 *
 * Usage:
 *   <QrPdfModal
 *     isOpen={showPdfModal}
 *     availableFloors={[1, 2, 3]}
 *     onClose={() => setShowPdfModal(false)}
 *   />
 */

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Overlay } from '../../../components/ui/Overlay';
import { useToast } from '../../../components/ui/Toast';
import { api, saveBlob } from '../../../lib/api-client';
import { describeError } from '../../../lib/error-handler';
import { Select } from '../../../components/ui/Field';

/** Sentinel value meaning "include all floors in the PDF". */
const ALL_FLOORS_SENTINEL = 'all';

export interface QrPdfModalProps {
  /** Whether the dialog is currently visible. */
  isOpen: boolean;
  /** Distinct floor numbers from the room inventory, sorted ascending. */
  availableFloors: number[];
  /** Called when the user dismisses the dialog. */
  onClose: () => void;
}

/**
 * Builds the query-string for the QR PDF endpoint.
 *
 * When a specific floor is selected the backend filters the tent-card sheet
 * to only that floor, keeping the PDF to a manageable size for a single
 * floor reprint.
 *
 * Returns `/rooms/qr.pdf` for all floors, or `/rooms/qr.pdf?floor=N` for a
 * specific floor.
 */
export function buildQrPdfEndpointPath(selectedFloor: string): string {
  if (selectedFloor === ALL_FLOORS_SENTINEL || !selectedFloor) {
    return '/rooms/qr.pdf';
  }
  return `/rooms/qr.pdf?floor=${encodeURIComponent(selectedFloor)}`;
}

/**
 * Derives a human-readable file name for the downloaded PDF based on the
 * chosen floor filter, e.g. "room-qr-codes-floor-2.pdf" vs
 * "room-qr-codes.pdf".
 */
export function deriveQrPdfFileName(selectedFloor: string): string {
  if (selectedFloor === ALL_FLOORS_SENTINEL || !selectedFloor) {
    return 'room-qr-codes.pdf';
  }
  return `room-qr-codes-floor-${selectedFloor}.pdf`;
}

/**
 * Modal that presents a floor selector and a "Download QR PDF" button.
 * While the PDF is being fetched the button shows a loading spinner and
 * is disabled to prevent duplicate requests.
 */
export function QrPdfModal({ isOpen, availableFloors, onClose }: QrPdfModalProps) {
  const [selectedFloorFilter, setSelectedFloorFilter] = useState(ALL_FLOORS_SENTINEL);
  const [isDownloading, setIsDownloading] = useState(false);
  const toast = useToast();

  async function handleDownloadRequest() {
    setIsDownloading(true);
    try {
      const endpointPath = buildQrPdfEndpointPath(selectedFloorFilter);
      const pdfBlob = await api.getBlob(endpointPath);
      const fileName = deriveQrPdfFileName(selectedFloorFilter);
      saveBlob(pdfBlob, fileName);
    } catch (error) {
      toast.error(describeError(error));
    } finally {
      setIsDownloading(false);
    }
  }

  if (!isOpen) return null;

  const hasMultipleFloors = availableFloors.length > 1;

  return (
    <Overlay
      open
      onClose={onClose}
      width="sm"
      title="Download QR tent cards"
      description="Print and fold the PDF tent cards for each room. Place one on the bedside table so guests can scan it to order."
      footer={
        <>
          <Button onClick={onClose} disabled={isDownloading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleDownloadRequest()}
            pending={isDownloading}
          >
            <Download className="h-4 w-4" strokeWidth={1.75} />
            Download PDF
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {hasMultipleFloors && (
          <div className="space-y-1.5">
            <label
              htmlFor="qr-pdf-floor-select"
              className="block text-[13px] font-medium text-ink"
            >
              Which floor?
            </label>
            <Select
              id="qr-pdf-floor-select"
              value={selectedFloorFilter}
              onChange={(event) => setSelectedFloorFilter(event.target.value)}
            >
              <option value={ALL_FLOORS_SENTINEL}>All floors</option>
              {availableFloors.map((floorNumber) => (
                <option key={floorNumber} value={String(floorNumber)}>
                  Floor {floorNumber}
                </option>
              ))}
            </Select>
            <p className="text-xs text-ink-3">
              Printing one floor at a time is faster when replacing a single card.
            </p>
          </div>
        )}

        <div className="rounded-md bg-sunken px-4 py-3 text-[13px] text-ink-2">
          <p className="font-medium text-ink">About QR tent cards</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Each card shows the room number and a unique QR code.</li>
            <li>Print on card stock, fold on the centre crease, and place on the bedside table.</li>
            <li>If a code is damaged or lost, issue a new code on the QR Codes page and reprint.</li>
          </ul>
        </div>
      </div>
    </Overlay>
  );
}
