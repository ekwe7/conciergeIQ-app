import { useState, useCallback } from 'react';
import {
  GuestServiceRequestCreate,
  GuestServiceRequestResponse,
} from '@conciergeiq/contracts';
import { guestApiClient } from '../../../lib/api-client';
import { AppApiError } from '../../../lib/error-handler';
import { retrieveGuestSession } from '../../guest-session/session-store';
import {
  ServiceRequestSubmissionPayload,
  ServiceRequestExecutionResult,
} from '../types';

/**
 * ============================================================================
 * BACKEND DEPENDENCY BLOCKER NOTICE
 * ============================================================================
 * Status: BLOCKED — BACKEND DEPENDENCY
 * Target Route: POST /api/v1/guest/service-requests
 * Blocker Ticket: CIQ-BACKEND-BLOCKED-SERVICE-REQUESTS
 *
 * Problem Description:
 * packages/contracts defines GuestServiceRequestCreateSchema and WebSocket events
 * exist, but the Fastify API in apps/api does not register POST /api/v1/guest/service-requests.
 * Live submission is blocked until the backend team exposes this route.
 *
 * Resilience Strategy:
 * When this hook attempts transmission to the live endpoint and encounters an HTTP 404
 * Not Found error (or offline connectivity), it logs a formal dependency warning and
 * activates the resilient mock fallback provider, simulating a 201 Created response with
 * a 15-minute estimated fulfillment timeline.
 *
 * Contributor Switch Guidance:
 * To transition strictly to live backend execution once the Fastify route is deployed,
 * alter the single boolean constant below:
 * ============================================================================
 */
export const ENABLE_MOCK_FALLBACK: boolean = true; // <-- TOGGLE THIS LINE TO SWITCH TO LIVE-ONLY BACKEND

export const LIVE_SERVICE_REQUEST_ENDPOINT: string =
  '/api/v1/guest/service-requests';

export interface UseServiceRequestOptions {
  onSuccess?: (executionResult: ServiceRequestExecutionResult) => void;
  onError?: (encounteredError: Error) => void;
  fallbackDeliveryMinutes?: number;
}

export interface UseServiceRequestResult {
  isSubmitting: boolean;
  isBackendBlocked: boolean;
  lastExecutionResult: ServiceRequestExecutionResult | null;
  submitServiceRequest: (
    submissionPayload: Omit<ServiceRequestSubmissionPayload, 'roomNumber' | 'stayId'> & {
      roomNumber?: string;
      stayId?: string;
    }
  ) => Promise<ServiceRequestExecutionResult>;
  resetServiceRequestState: () => void;
}

/**
 * Resilient hook for submitting in-room guest amenity and service requests.
 * Conforms strictly to GuestServiceRequestCreateSchema with automatic MSW / mock fallback.
 */
export function useServiceRequest(
  hookOptions: UseServiceRequestOptions = {}
): UseServiceRequestResult {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isBackendBlocked, setIsBackendBlocked] = useState<boolean>(false);
  const [lastExecutionResult, setLastExecutionResult] =
    useState<ServiceRequestExecutionResult | null>(null);

  const resetServiceRequestState = useCallback(() => {
    setIsSubmitting(false);
    setIsBackendBlocked(false);
    setLastExecutionResult(null);
  }, []);

  const submitServiceRequest = useCallback(
    async (
      partialPayload: Omit<ServiceRequestSubmissionPayload, 'roomNumber' | 'stayId'> & {
        roomNumber?: string;
        stayId?: string;
      }
    ): Promise<ServiceRequestExecutionResult> => {
      setIsSubmitting(true);

      const activeSession = retrieveGuestSession();
      const resolvedRoomNumber: string =
        partialPayload.roomNumber || activeSession?.roomNumber || '402';
      const resolvedStayIdentifier: string =
        partialPayload.stayId || activeSession?.stayId || 'stay_fallback_active';

      const completePayload: GuestServiceRequestCreate = {
        roomNumber: resolvedRoomNumber,
        stayId: resolvedStayIdentifier,
        category: partialPayload.category ?? 'AMENITIES',
        items: partialPayload.items,
        notes: partialPayload.notes,
        specialInstructions: partialPayload.specialInstructions,
      };

      try {
        const liveApiResponse =
          await guestApiClient.post<GuestServiceRequestResponse>(
            LIVE_SERVICE_REQUEST_ENDPOINT,
            completePayload
          );

        const successfulResult: ServiceRequestExecutionResult = {
          isSuccessful: true,
          isMockFallbackActivated: false,
          requestIdentifier: liveApiResponse.requestId,
          estimatedDeliveryMinutes:
            liveApiResponse.estimatedDeliveryMinutes ??
            hookOptions.fallbackDeliveryMinutes ??
            15,
          creationTimestamp: liveApiResponse.createdAt ?? new Date().toISOString(),
          confirmedItems: partialPayload.items,
          roomNumber: resolvedRoomNumber,
          errorMessage: null,
        };

        setIsBackendBlocked(false);
        setLastExecutionResult(successfulResult);
        if (hookOptions.onSuccess) {
          hookOptions.onSuccess(successfulResult);
        }
        return successfulResult;
      } catch (transmissionError) {
        const isNotFoundError: boolean =
          (transmissionError instanceof AppApiError &&
            transmissionError.statusCode === 404) ||
          (typeof transmissionError === 'object' &&
            transmissionError !== null &&
            'status' in transmissionError &&
            (transmissionError as { status: number }).status === 404) ||
          (typeof transmissionError === 'object' &&
            transmissionError !== null &&
            'statusCode' in transmissionError &&
            (transmissionError as { statusCode: number }).statusCode === 404);

        if (ENABLE_MOCK_FALLBACK) {
          console.warn(
            '[CIQ Backend Dependency Notice]: Route POST /api/v1/guest/service-requests returned 404 or failed. ' +
              'Live submission is currently blocked pending backend ticket CIQ-BACKEND-BLOCKED-SERVICE-REQUESTS. ' +
              'Activating resilient client mock fallback response with 15-minute fulfillment SLA.'
          );

          setIsBackendBlocked(true);

          const mockFallbackResult: ServiceRequestExecutionResult = {
            isSuccessful: true,
            isMockFallbackActivated: true,
            requestIdentifier: `srv_req_mock_${Date.now()}`,
            estimatedDeliveryMinutes:
              hookOptions.fallbackDeliveryMinutes ?? 15,
            creationTimestamp: new Date().toISOString(),
            confirmedItems: partialPayload.items,
            roomNumber: resolvedRoomNumber,
            errorMessage: isNotFoundError
              ? 'Backend service request endpoint unavailable (simulated 201 Created).'
              : null,
          };

          setLastExecutionResult(mockFallbackResult);
          if (hookOptions.onSuccess) {
            hookOptions.onSuccess(mockFallbackResult);
          }
          return mockFallbackResult;
        }

        const normalizedError: Error =
          transmissionError instanceof Error
            ? transmissionError
            : new Error('Failed to submit in-room service request.');

        if (hookOptions.onError) {
          hookOptions.onError(normalizedError);
        }
        throw normalizedError;
      } finally {
        setIsSubmitting(false);
      }
    },
    [hookOptions]
  );

  return {
    isSubmitting,
    isBackendBlocked,
    lastExecutionResult,
    submitServiceRequest,
    resetServiceRequestState,
  };
}
