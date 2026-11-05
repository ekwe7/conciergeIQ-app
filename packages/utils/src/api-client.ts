import { AppApiError, normalizeApiError } from './error-handler';

/**
 * Configuration options for initializing the centralized API client.
 */
export interface ApiClientConfiguration {
  baseURL: string;
  getToken?: () => Promise<string | null> | string | null;
  timeoutMilliseconds?: number;
  defaultHeaders?: Record<string, string>;
}

/**
 * Request options passed to individual HTTP methods.
 */
export interface ApiRequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMilliseconds?: number;
}

export interface ApiClient {
  get<ResponseType>(endpointPath: string, options?: ApiRequestOptions): Promise<ResponseType>;
  post<ResponseType, RequestBodyType = unknown>(
    endpointPath: string,
    requestBody?: RequestBodyType,
    options?: ApiRequestOptions
  ): Promise<ResponseType>;
  patch<ResponseType, RequestBodyType = unknown>(
    endpointPath: string,
    requestBody?: RequestBodyType,
    options?: ApiRequestOptions
  ): Promise<ResponseType>;
  delete<ResponseType>(endpointPath: string, options?: ApiRequestOptions): Promise<ResponseType>;
  getBlob(endpointPath: string, options?: ApiRequestOptions): Promise<Blob>;
}

/**
 * Factory creating a centralized, strongly typed API client with token injection,
 * automatic JSON parsing, request timeouts, and RFC 7807 error normalization.
 */
export function createApiClient(configuration: ApiClientConfiguration): ApiClient {
  const normalizedBaseUrl = configuration.baseURL.replace(/\/+$/, '');
  const defaultTimeoutMilliseconds = configuration.timeoutMilliseconds ?? 15000;

  async function executeRequest(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    endpointPath: string,
    requestBody?: unknown,
    options?: ApiRequestOptions,
    expectBlob: boolean = false
  ): Promise<unknown> {
    const sanitizedPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
    const targetUrl = `${normalizedBaseUrl}${sanitizedPath}`;

    const headersCollection = new Headers({
      Accept: expectBlob ? '*/*' : 'application/json',
      ...configuration.defaultHeaders,
      ...options?.headers,
    });

    if (configuration.getToken) {
      const resolvedToken = await configuration.getToken();
      if (resolvedToken && resolvedToken.trim().length > 0) {
        headersCollection.set('Authorization', `Bearer ${resolvedToken.trim()}`);
      }
    }

    let serializedBody: BodyInit | undefined = undefined;
    if (requestBody !== undefined) {
      if (typeof requestBody === 'string' || requestBody instanceof FormData || requestBody instanceof Blob) {
        serializedBody = requestBody;
      } else {
        headersCollection.set('Content-Type', 'application/json');
        serializedBody = JSON.stringify(requestBody);
      }
    }

    const abortController = new AbortController();
    const timeoutDuration = options?.timeoutMilliseconds ?? defaultTimeoutMilliseconds;
    const timeoutIdentifier = setTimeout(() => {
      abortController.abort(new Error(`API request timed out after ${timeoutDuration}ms.`));
    }, timeoutDuration);

    if (options?.signal) {
      options.signal.addEventListener('abort', () => abortController.abort(options.signal?.reason));
    }

    try {
      const response = await fetch(targetUrl, {
        method,
        headers: headersCollection,
        body: serializedBody,
        signal: abortController.signal,
      });

      if (!response.ok) {
        let errorPayload: unknown = null;
        try {
          const contentType = response.headers.get('content-type') ?? '';
          if (contentType.includes('application/json') || contentType.includes('application/problem+json')) {
            errorPayload = await response.json();
          } else {
            errorPayload = await response.text();
          }
        } catch {
          errorPayload = null;
        }

        throw normalizeApiError(
          response.status,
          errorPayload,
          `HTTP request failed with status code ${response.status}.`
        );
      }

      if (expectBlob) {
        return await response.blob();
      }

      if (response.status === 204) {
        return null;
      }

      const responseContentType = response.headers.get('content-type') ?? '';
      if (responseContentType.includes('application/json')) {
        return await response.json();
      }

      return await response.text();
    } catch (caughtError: unknown) {
      if (caughtError instanceof AppApiError) {
        throw caughtError;
      }

      const isTimeoutError =
        caughtError instanceof Error &&
        (caughtError.name === 'AbortError' || caughtError.message.includes('timed out'));

      if (isTimeoutError) {
        throw new AppApiError({
          message: `Request to ${sanitizedPath} timed out after ${timeoutDuration}ms.`,
          statusCode: 408,
          errorCode: 'NETWORK_ERROR',
          errorTitle: 'Request Timeout',
        });
      }

      const errorMessage = caughtError instanceof Error ? caughtError.message : 'Network request failed';
      throw new AppApiError({
        message: errorMessage,
        statusCode: 0,
        errorCode: 'NETWORK_ERROR',
        errorTitle: 'Network Connection Failure',
        rawPayload: caughtError,
      });
    } finally {
      clearTimeout(timeoutIdentifier);
    }
  }

  return {
    async get<ResponseType>(endpointPath: string, options?: ApiRequestOptions): Promise<ResponseType> {
      return (await executeRequest('GET', endpointPath, undefined, options, false)) as ResponseType;
    },

    async post<ResponseType, RequestBodyType = unknown>(
      endpointPath: string,
      requestBody?: RequestBodyType,
      options?: ApiRequestOptions
    ): Promise<ResponseType> {
      return (await executeRequest('POST', endpointPath, requestBody, options, false)) as ResponseType;
    },

    async patch<ResponseType, RequestBodyType = unknown>(
      endpointPath: string,
      requestBody?: RequestBodyType,
      options?: ApiRequestOptions
    ): Promise<ResponseType> {
      return (await executeRequest('PATCH', endpointPath, requestBody, options, false)) as ResponseType;
    },

    async delete<ResponseType>(endpointPath: string, options?: ApiRequestOptions): Promise<ResponseType> {
      return (await executeRequest('DELETE', endpointPath, undefined, options, false)) as ResponseType;
    },

    async getBlob(endpointPath: string, options?: ApiRequestOptions): Promise<Blob> {
      return (await executeRequest('GET', endpointPath, undefined, options, true)) as Blob;
    },
  };
}
