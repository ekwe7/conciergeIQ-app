/**
 * RFC 7807 Problem Details representation.
 */
export interface ProblemDetailsPayload {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  code?: string;
  errors?: Record<string, string[] | string>;
  message?: string;
  statusCode?: number;
}

export type StandardApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'BAD_REQUEST';

export interface AppApiErrorProperties {
  message: string;
  statusCode: number;
  errorCode: StandardApiErrorCode;
  errorTitle: string;
  rawPayload?: unknown;
  validationFieldErrors?: Record<string, string[] | string>;
}

export class AppApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: StandardApiErrorCode;
  public readonly errorTitle: string;
  public readonly rawPayload?: unknown;
  public readonly validationFieldErrors?: Record<string, string[] | string>;

  constructor(properties: AppApiErrorProperties) {
    super(properties.message);
    this.name = 'AppApiError';
    this.statusCode = properties.statusCode;
    this.errorCode = properties.errorCode;
    this.errorTitle = properties.errorTitle;
    this.rawPayload = properties.rawPayload;
    this.validationFieldErrors = properties.validationFieldErrors;
    Object.setPrototypeOf(this, AppApiError.prototype);
  }
}

function resolveStandardErrorCode(
  statusCode: number,
  candidateCode?: string
): StandardApiErrorCode {
  if (candidateCode) {
    const uppercaseCode = candidateCode.toUpperCase();
    if (uppercaseCode === 'VALIDATION_ERROR') return 'VALIDATION_ERROR';
    if (uppercaseCode === 'UNAUTHORIZED') return 'UNAUTHORIZED';
    if (uppercaseCode === 'FORBIDDEN') return 'FORBIDDEN';
    if (uppercaseCode === 'NOT_FOUND') return 'NOT_FOUND';
    if (uppercaseCode === 'CONFLICT') return 'CONFLICT';
    if (uppercaseCode === 'RATE_LIMIT_EXCEEDED') return 'RATE_LIMIT_EXCEEDED';
  }

  switch (statusCode) {
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
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

/**
 * Normalizes an HTTP response payload into a strongly-typed AppApiError object.
 */
export function normalizeApiError(
  statusCode: number,
  rawPayload: unknown,
  fallbackMessage: string = 'An unexpected API error occurred.'
): AppApiError {
  if (rawPayload && typeof rawPayload === 'object') {
    const problemPayload = rawPayload as ProblemDetailsPayload;
    const resolvedMessage =
      problemPayload.detail ||
      problemPayload.message ||
      problemPayload.title ||
      fallbackMessage;

    const resolvedTitle = problemPayload.title || `HTTP Error ${statusCode}`;
    const resolvedCode = resolveStandardErrorCode(statusCode, problemPayload.code);

    return new AppApiError({
      message: resolvedMessage,
      statusCode,
      errorCode: resolvedCode,
      errorTitle: resolvedTitle,
      rawPayload,
      validationFieldErrors: problemPayload.errors,
    });
  }

  return new AppApiError({
    message: typeof rawPayload === 'string' && rawPayload.length > 0 ? rawPayload : fallbackMessage,
    statusCode,
    errorCode: resolveStandardErrorCode(statusCode),
    errorTitle: `HTTP Error ${statusCode}`,
    rawPayload,
  });
}
