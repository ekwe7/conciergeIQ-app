/**
 * RFC 7807 Error Normalization & Application API Error Types.
 * Standardizes backend error envelopes across Fastify and HTTP gateways.
 */

export interface Rfc7807ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  statusCode?: number;
  detail?: string;
  message?: string;
  instance?: string;
  code?: string;
  validationErrors?: unknown[];
  error?: string;
}

export type CanonicalApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'BAD_REQUEST'
  | 'INTERNAL_SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Normalized API error object thrown by the HTTP client.
 */
export class AppApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: CanonicalApiErrorCode | string;
  public readonly errorTitle: string;
  public readonly instance?: string;
  public readonly validationErrors?: unknown[];
  public readonly rawPayload?: unknown;

  constructor(parameters: {
    message: string;
    statusCode: number;
    errorCode: CanonicalApiErrorCode | string;
    errorTitle?: string;
    instance?: string;
    validationErrors?: unknown[];
    rawPayload?: unknown;
  }) {
    super(parameters.message);
    this.name = 'AppApiError';
    this.statusCode = parameters.statusCode;
    this.errorCode = parameters.errorCode;
    this.errorTitle = parameters.errorTitle ?? parameters.message;
    this.instance = parameters.instance;
    this.validationErrors = parameters.validationErrors;
    this.rawPayload = parameters.rawPayload;

    Object.setPrototypeOf(this, AppApiError.prototype);
  }
}

/**
 * Derives a canonical error code from HTTP status codes when no explicit code is provided.
 */
function deriveCanonicalErrorCodeFromStatus(httpStatusCode: number): CanonicalApiErrorCode {
  switch (httpStatusCode) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'VALIDATION_ERROR';
    case 429:
      return 'RATE_LIMIT_EXCEEDED';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'INTERNAL_SERVER_ERROR';
    default:
      return 'UNKNOWN_ERROR';
  }
}

/**
 * Parses raw HTTP response bodies and converts RFC 7807 problem details or Fastify
 * error envelopes into a typed, standardized AppApiError.
 */
export function normalizeApiError(
  responseStatusCode: number,
  responseBody: unknown,
  fallbackMessage: string = 'An unexpected server error occurred.'
): AppApiError {
  // The ConciergeIQ API answers errors as `{ error: { code, message, details } }`.
  const envelope = (responseBody as { error?: unknown } | null)?.error;
  if (envelope !== null && typeof envelope === 'object' && !Array.isArray(envelope)) {
    const { code, message, details } = envelope as { code?: unknown; message?: unknown; details?: unknown };
    return new AppApiError({
      message: typeof message === 'string' && message.length > 0 ? message : fallbackMessage,
      statusCode: responseStatusCode,
      errorCode: typeof code === 'string' ? code : deriveCanonicalErrorCodeFromStatus(responseStatusCode),
      errorTitle: 'API Request Error',
      validationErrors: Array.isArray(details) ? details : undefined,
      rawPayload: responseBody,
    });
  }

  if (responseBody !== null && typeof responseBody === 'object') {
    const problemDetails = responseBody as Rfc7807ProblemDetails;

    const extractedMessage =
      problemDetails.detail ??
      problemDetails.message ??
      problemDetails.title ??
      problemDetails.error ??
      fallbackMessage;

    const extractedTitle =
      problemDetails.title ??
      problemDetails.error ??
      'API Request Error';

    const explicitErrorCode =
      problemDetails.code ??
      (problemDetails.error === 'Bad Request' && problemDetails.validationErrors?.length
        ? 'VALIDATION_ERROR'
        : deriveCanonicalErrorCodeFromStatus(responseStatusCode));

    return new AppApiError({
      message: extractedMessage,
      statusCode: problemDetails.status ?? problemDetails.statusCode ?? responseStatusCode,
      errorCode: explicitErrorCode,
      errorTitle: extractedTitle,
      instance: problemDetails.instance,
      validationErrors: problemDetails.validationErrors,
      rawPayload: responseBody,
    });
  }

  if (typeof responseBody === 'string' && responseBody.trim().length > 0) {
    return new AppApiError({
      message: responseBody,
      statusCode: responseStatusCode,
      errorCode: deriveCanonicalErrorCodeFromStatus(responseStatusCode),
      errorTitle: 'Server Error',
      rawPayload: responseBody,
    });
  }

  return new AppApiError({
    message: fallbackMessage,
    statusCode: responseStatusCode,
    errorCode: deriveCanonicalErrorCodeFromStatus(responseStatusCode),
    errorTitle: 'Request Failed',
    rawPayload: responseBody,
  });
}
