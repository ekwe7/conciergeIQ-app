import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import {
  formatMinorUnits,
  formatMoney,
  isValidIsoDate,
  formatIsoTimestamp,
  formatTimeOnly,
  formatDateOnly,
  formatRelativeTime,
  AppApiError,
  normalizeApiError,
  createApiClient,
} from '../src/index';

const mockBaseUrl = 'https://api.conciergeiq.test';

const mockHttpServer = setupServer(
  http.get(`${mockBaseUrl}/api/v1/test-success`, () => {
    return HttpResponse.json({ success: true, message: 'Operation successful' });
  }),

  http.post(`${mockBaseUrl}/api/v1/test-create`, async ({ request }) => {
    const requestJson = await request.json();
    return HttpResponse.json({ created: true, received: requestJson }, { status: 201 });
  }),

  http.patch(`${mockBaseUrl}/api/v1/test-update`, async ({ request }) => {
    const requestJson = await request.json();
    return HttpResponse.json({ updated: true, received: requestJson });
  }),

  http.delete(`${mockBaseUrl}/api/v1/test-delete`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${mockBaseUrl}/api/v1/test-blob`, () => {
    const pdfBlob = new Blob(['%PDF-1.4 mock tent card binary'], { type: 'application/pdf' });
    return new HttpResponse(pdfBlob, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf' },
    });
  }),

  http.get(`${mockBaseUrl}/api/v1/test-auth-header`, ({ request }) => {
    const authorizationHeader = request.headers.get('Authorization');
    return HttpResponse.json({ authorizationHeader });
  }),

  // Error simulation endpoints
  http.get(`${mockBaseUrl}/api/v1/errors/validation`, () => {
    return HttpResponse.json(
      {
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Validation Error',
        status: 400,
        code: 'VALIDATION_ERROR',
        detail: 'The submitted order item quantity is invalid.',
        validationErrors: [{ field: 'quantity', message: 'Must be greater than 0' }],
      },
      { status: 400, headers: { 'Content-Type': 'application/problem+json' } }
    );
  }),

  http.get(`${mockBaseUrl}/api/v1/errors/unauthorized`, () => {
    return HttpResponse.json(
      {
        title: 'Unauthorized',
        status: 401,
        code: 'UNAUTHORIZED',
        detail: 'Session token has expired or is invalid.',
      },
      { status: 401 }
    );
  }),

  http.get(`${mockBaseUrl}/api/v1/errors/forbidden`, () => {
    return HttpResponse.json(
      {
        title: 'Forbidden',
        status: 403,
        code: 'FORBIDDEN',
        detail: 'Staff user lacks required MANAGER permissions.',
      },
      { status: 403 }
    );
  }),

  http.get(`${mockBaseUrl}/api/v1/errors/not-found`, () => {
    return HttpResponse.json(
      {
        title: 'Not Found',
        status: 404,
        code: 'NOT_FOUND',
        detail: 'The requested room order was not found.',
      },
      { status: 404 }
    );
  }),

  http.get(`${mockBaseUrl}/api/v1/errors/conflict`, () => {
    return HttpResponse.json(
      {
        title: 'Conflict',
        status: 409,
        code: 'CONFLICT',
        detail: 'Active stay already exists for room 402.',
      },
      { status: 409 }
    );
  }),

  http.get(`${mockBaseUrl}/api/v1/errors/rate-limit`, () => {
    return HttpResponse.json(
      {
        title: 'Rate Limit Exceeded',
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        detail: 'Too many requests. Please wait before retrying.',
      },
      { status: 429 }
    );
  }),

  http.get(`${mockBaseUrl}/api/v1/errors/server-error`, () => {
    return HttpResponse.json(
      {
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unhandled database exception occurred.',
      },
      { status: 500 }
    );
  })
);

beforeAll(() => mockHttpServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => mockHttpServer.resetHandlers());
afterAll(() => mockHttpServer.close());

describe('Shared Utilities - Monetary Calculations', () => {
  it('formats minor units to localized currency without floating-point math', () => {
    expect(formatMinorUnits(350000, 'NGN')).toBe('₦3,500.00');
    expect(formatMinorUnits(2400, 'USD')).toBe('$24.00');
    expect(formatMinorUnits(1550, 'EUR')).toBe('€15.50');
    expect(formatMinorUnits(999, 'GBP')).toBe('£9.99');
    expect(formatMinorUnits(0, 'USD')).toBe('$0.00');
    expect(formatMinorUnits(-1200, 'NGN')).toBe('-₦12.00');
    expect(formatMoney(3200, 'USD')).toBe('$32.00');
  });

  it('rejects floating-point input amounts strictly', () => {
    expect(() => formatMinorUnits(35.5, 'NGN')).toThrow(TypeError);
    expect(() => formatMinorUnits(1200.05, 'USD')).toThrow(TypeError);
  });
});

describe('Shared Utilities - Date & Time Formatting', () => {
  it('validates ISO 8601 strings accurately', () => {
    expect(isValidIsoDate('2026-11-02T19:30:00.000Z')).toBe(true);
    expect(isValidIsoDate('invalid-date')).toBe(false);
    expect(isValidIsoDate('')).toBe(false);
  });

  it('formats dates, times, and relative elapsed intervals', () => {
    const fixedIsoString = '2026-11-02T19:30:00.000Z';
    expect(formatIsoTimestamp(fixedIsoString)).toBeDefined();
    expect(formatTimeOnly(fixedIsoString)).toBeDefined();
    expect(formatDateOnly(fixedIsoString)).toBeDefined();

    const currentTimestampMilliseconds = new Date('2026-11-02T20:00:00.000Z').getTime();
    const tenMinutesPrior = new Date('2026-11-02T19:50:00.000Z').toISOString();
    const twoHoursPrior = new Date('2026-11-02T18:00:00.000Z').toISOString();
    const threeDaysPrior = new Date('2026-10-30T20:00:00.000Z').toISOString();

    expect(formatRelativeTime(tenMinutesPrior, currentTimestampMilliseconds)).toBe('10m ago');
    expect(formatRelativeTime(twoHoursPrior, currentTimestampMilliseconds)).toBe('2h ago');
    expect(formatRelativeTime(threeDaysPrior, currentTimestampMilliseconds)).toBe('3d ago');
  });
});

describe('Shared Utilities - RFC 7807 Error Normalization', () => {
  it('normalizes RFC 7807 problem details payloads into AppApiError instances', () => {
    const rawRfcPayload = {
      type: 'https://tools.ietf.org/html/rfc7807',
      title: 'Validation Error',
      status: 400,
      code: 'VALIDATION_ERROR',
      detail: 'Field roomNumber is required.',
      validationErrors: [{ field: 'roomNumber', message: 'Required' }],
    };

    const normalizedError = normalizeApiError(400, rawRfcPayload);
    expect(normalizedError).toBeInstanceOf(AppApiError);
    expect(normalizedError.statusCode).toBe(400);
    expect(normalizedError.errorCode).toBe('VALIDATION_ERROR');
    expect(normalizedError.message).toBe('Field roomNumber is required.');
    expect(normalizedError.validationErrors).toHaveLength(1);
  });
});

describe('Shared Utilities - HTTP API Client with Mock Service Worker', () => {
  const apiClient = createApiClient({
    baseURL: mockBaseUrl,
    getToken: () => 'valid_bearer_token_xyz',
  });

  it('performs GET, POST, PATCH, and DELETE requests successfully', async () => {
    const getResponse = await apiClient.get<{ success: boolean; message: string }>('/api/v1/test-success');
    expect(getResponse.success).toBe(true);

    const postResponse = await apiClient.post<{ created: boolean; received: { item: string } }>(
      '/api/v1/test-create',
      { item: 'Avocado Toast' }
    );
    expect(postResponse.created).toBe(true);
    expect(postResponse.received.item).toBe('Avocado Toast');

    const patchResponse = await apiClient.patch<{ updated: boolean }>(
      '/api/v1/test-update',
      { isAvailable: false }
    );
    expect(patchResponse.updated).toBe(true);

    const deleteResponse = await apiClient.delete('/api/v1/test-delete');
    expect(deleteResponse).toBeNull();
  });

  it('streams binary file downloads via getBlob', async () => {
    const blobResponse = await apiClient.getBlob('/api/v1/test-blob');
    expect(blobResponse).toBeInstanceOf(Blob);
    expect(blobResponse.type).toBe('application/pdf');
  });

  it('injects Bearer token into outgoing Authorization headers', async () => {
    const authHeaderResponse = await apiClient.get<{ authorizationHeader: string }>(
      '/api/v1/test-auth-header'
    );
    expect(authHeaderResponse.authorizationHeader).toBe('Bearer valid_bearer_token_xyz');
  });

  it('intercepts HTTP 400 validation error and throws typed AppApiError', async () => {
    await expect(apiClient.get('/api/v1/errors/validation')).rejects.toThrow(AppApiError);
    try {
      await apiClient.get('/api/v1/errors/validation');
    } catch (caughtError) {
      const apiError = caughtError as AppApiError;
      expect(apiError.statusCode).toBe(400);
      expect(apiError.errorCode).toBe('VALIDATION_ERROR');
      expect(apiError.validationErrors).toBeDefined();
    }
  });

  it('intercepts HTTP 401, 403, 404, 409, 429, and 500 error envelopes properly', async () => {
    const errorEndpoints = [
      { path: '/api/v1/errors/unauthorized', expectedStatus: 401, expectedCode: 'UNAUTHORIZED' },
      { path: '/api/v1/errors/forbidden', expectedStatus: 403, expectedCode: 'FORBIDDEN' },
      { path: '/api/v1/errors/not-found', expectedStatus: 404, expectedCode: 'NOT_FOUND' },
      { path: '/api/v1/errors/conflict', expectedStatus: 409, expectedCode: 'CONFLICT' },
      { path: '/api/v1/errors/rate-limit', expectedStatus: 429, expectedCode: 'RATE_LIMIT_EXCEEDED' },
      { path: '/api/v1/errors/server-error', expectedStatus: 500, expectedCode: 'INTERNAL_SERVER_ERROR' },
    ];

    for (const errorCase of errorEndpoints) {
      try {
        await apiClient.get(errorCase.path);
        expect.unreachable('Should have thrown an AppApiError');
      } catch (caughtError) {
        const apiError = caughtError as AppApiError;
        expect(apiError.statusCode).toBe(errorCase.expectedStatus);
        expect(apiError.errorCode).toBe(errorCase.expectedCode);
      }
    }
  });
});
