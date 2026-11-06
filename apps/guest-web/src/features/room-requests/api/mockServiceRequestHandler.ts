import { http, HttpResponse } from 'msw';
import { GuestServiceRequestResponse } from '@conciergeiq/contracts';

export const serviceRequestEndpointPattern: RegExp = new RegExp(
  '/api/v1/guest/service-requests$'
);

export interface MockServiceRequestHandlerOptions {
  simulatedStatusCode?: number;
  simulatedEstimatedMinutes?: number;
  shouldSimulateNetworkDelay?: boolean;
}

/**
 * Creates an MSW request handler for the guest service requests endpoint.
 * Supports simulating HTTP 201 Created responses or HTTP 404 Not Found responses
 * to test live execution against backend blockers.
 */
export function createMockServiceRequestHandler(
  configurationOptions: MockServiceRequestHandlerOptions = {}
) {
  const simulatedStatusCode: number =
    configurationOptions.simulatedStatusCode ?? 201;
  const simulatedEstimatedMinutes: number =
    configurationOptions.simulatedEstimatedMinutes ?? 15;

  return http.post(serviceRequestEndpointPattern, async ({ request }) => {
    if (simulatedStatusCode === 404) {
      return HttpResponse.json(
        {
          type: 'https://conciergeiq.com/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail:
            'Route POST /api/v1/guest/service-requests not implemented by Fastify backend (BLOCKED — BACKEND DEPENDENCY).',
        },
        { status: 404 }
      );
    }

    const unparsedBody = (await request.json()) as Record<string, unknown>;
    const targetRoomNumber: string =
      typeof unparsedBody.roomNumber === 'string' &&
      unparsedBody.roomNumber.length > 0
        ? unparsedBody.roomNumber
        : '402';

    const requestedItems = Array.isArray(unparsedBody.items)
      ? unparsedBody.items
      : [];

    const mockResponsePayload: GuestServiceRequestResponse = {
      requestId: `srv_mock_${Date.now()}`,
      status: 'RECEIVED',
      estimatedDeliveryMinutes: simulatedEstimatedMinutes,
      roomNumber: targetRoomNumber,
      items: requestedItems as GuestServiceRequestResponse['items'],
      createdAt: new Date().toISOString(),
    };

    return HttpResponse.json(mockResponsePayload, { status: 201 });
  });
}
