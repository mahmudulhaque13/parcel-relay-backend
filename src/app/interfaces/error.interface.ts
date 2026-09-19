/**
 * Shared error-handling types used by the centralized error middleware and the
 * standardized error response envelope.
 */
export interface TErrorSource {
  path: string | number;
  message: string;
}

export interface TErrorResponse {
  success: false;
  message: string;
  errors: TErrorSource[];
}

export interface THandledError {
  statusCode: number;
  message: string;
  errors: TErrorSource[];
}
