import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { guestApiClient } from '../../../lib/api-client';
import { CartLineItem } from '../../cart/types';
import {
  CreateOrderPayload,
  PlaceOrderMutationVariables,
  PlacedOrderResponse,
  UsePlaceOrderOptions,
} from '../types';

/**
 * Generates a cryptographic UUID v4 string for the Idempotency-Key HTTP header.
 * Uses the Web Crypto API crypto.randomUUID() when available, with a compliant
 * fallback for environments lacking crypto.randomUUID.
 */
export function generateCryptographicIdempotencyKey(): string {
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  // Cryptographic fallback using getRandomValues
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.getRandomValues === 'function'
  ) {
    const randomByteValues = new Uint8Array(16);
    globalThis.crypto.getRandomValues(randomByteValues);
    randomByteValues[6] = (randomByteValues[6] & 0x0f) | 0x40; // Version 4
    randomByteValues[8] = (randomByteValues[8] & 0x3f) | 0x80; // Variant RFC 4122
    const hexCharacters = Array.from(randomByteValues).map((byteValue) =>
      byteValue.toString(16).padStart(2, '0')
    );
    return `${hexCharacters.slice(0, 4).join('')}-${hexCharacters.slice(4, 6).join('')}-${hexCharacters.slice(6, 8).join('')}-${hexCharacters.slice(8, 10).join('')}-${hexCharacters.slice(10, 16).join('')}`;
  }

  // Pseudo-random fallback for legacy test environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (characterPlaceholder) => {
    const randomInteger = (Math.random() * 16) | 0;
    const resolvedValue = characterPlaceholder === 'x' ? randomInteger : (randomInteger & 0x3) | 0x8;
    return resolvedValue.toString(16);
  });
}

/**
 * Transforms client-side shopping cart line items into a CreateOrderPayload
 * conforming to CreateOrderRequestSchema.
 */
export function mapCartLinesToOrderPayload(
  targetRoomNumber: string,
  targetStayIdentifier: string,
  cartLineItems: CartLineItem[]
): CreateOrderPayload {
  return {
    roomNumber: targetRoomNumber,
    stayId: targetStayIdentifier,
    items: cartLineItems.map((cartLineEntry) => ({
      itemId: cartLineEntry.item.id,
      quantity: cartLineEntry.quantity,
      specialInstructions: cartLineEntry.specialInstructions || undefined,
      notes: cartLineEntry.specialInstructions || undefined,
    })),
  };
}

/**
 * Mutation hook for guest order placement against POST /api/v1/guest/orders.
 * Injects cryptographic UUID v4 Idempotency-Key headers, ensures request uniqueness,
 * and passes the active guest session authorization token.
 */
export function usePlaceOrder(
  options: UsePlaceOrderOptions = {}
): UseMutationResult<PlacedOrderResponse, Error, PlaceOrderVariablesWrapper> {
  return useMutation<PlacedOrderResponse, Error, PlaceOrderVariablesWrapper>({
    mutationFn: async (
      mutationVariables: PlaceOrderVariablesWrapper
    ): Promise<PlacedOrderResponse> => {
      const resolvedIdempotencyKey =
        mutationVariables.idempotencyKey || generateCryptographicIdempotencyKey();

      const requestHeaders: Record<string, string> = {
        'Idempotency-Key': resolvedIdempotencyKey,
      };

      if (
        mutationVariables.sessionToken &&
        mutationVariables.sessionToken.trim().length > 0
      ) {
        requestHeaders['Authorization'] = `Bearer ${mutationVariables.sessionToken.trim()}`;
      }

      const orderPlacementEndpoint = '/api/v1/guest/orders';
      const serverResponse = await guestApiClient.post<
        PlacedOrderResponse,
        CreateOrderPayload
      >(orderPlacementEndpoint, mutationVariables.payload, {
        headers: requestHeaders,
      });

      return serverResponse;
    },
    onSuccess: (placedOrderResponse: PlacedOrderResponse) => {
      if (options.onSuccessCallback) {
        options.onSuccessCallback(placedOrderResponse);
      }
    },
    onError: (caughtError: Error) => {
      if (options.onErrorCallback) {
        options.onErrorCallback(caughtError);
      }
    },
  });
}

export type PlaceOrderVariablesWrapper = PlaceOrderMutationVariables;
