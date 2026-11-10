/**
 * Public barrel for the rooms feature's shared components.
 *
 * Import from here rather than from the individual files so internal
 * refactors do not break import paths in consumers.
 */

export { RoomCardGrid, deriveRoomOccupancyStatus } from './RoomCardGrid';
export type { RoomCardGridProps, RoomOccupancyStatus } from './RoomCardGrid';

export { CreateRoomModal, expandRoomNumberRange, isValidFloorInput } from './CreateRoomModal';
export type { CreateRoomModalProps } from './CreateRoomModal';

export { QrPdfModal, buildQrPdfEndpointPath, deriveQrPdfFileName } from './QrPdfModal';
export type { QrPdfModalProps } from './QrPdfModal';
