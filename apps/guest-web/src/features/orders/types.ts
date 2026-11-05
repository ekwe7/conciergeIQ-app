import { Order } from '@conciergeiq/contracts';

/**
 * Single dish line item included within an order submission payload.
 * Supports both 'specialInstructions' (contract schema) and 'notes' (UI customizer alias).
 */
export interface CreateOrderItemPayload {
  itemId: string;
  quantity: number;
  specialInstructions?: string;
  notes?: string;
}

/**
 * Request payload sent to POST /api/v1/guest/orders conforming to CreateOrderRequestSchema.
 */
export interface CreateOrderPayload {
  roomNumber: string;
  stayId: string;
  items: CreateOrderItemPayload[];
}

/**
 * Server response returned from POST /api/v1/guest/orders upon HTTP 201 Created.
 */
export interface PlacedOrderResponse {
  id: string;
  roomNumber?: string;
  stayId?: string;
  hotelId?: string;
  status?: string;
  items?: unknown[];
  subtotalMinor?: number;
  taxMinor?: number;
  totalMinor?: number;
  createdAt?: string;
  updatedAt?: string;
  order?: Order;
  [additionalProperty: string]: unknown;
}

/**
 * Mutation variables consumed by the usePlaceOrder mutation hook.
 */
export interface PlaceOrderMutationVariables {
  payload: CreateOrderPayload;
  sessionToken?: string;
  idempotencyKey?: string;
}

/**
 * Configuration options and lifecycle callbacks for usePlaceOrder hook.
 */
export interface UsePlaceOrderOptions {
  onSuccessCallback?: (placedOrder: PlacedOrderResponse) => void;
  onErrorCallback?: (caughtError: Error) => void;
}
