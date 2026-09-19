/**
 * Operational application error carrying an HTTP status code.
 *
 * Use this (or the static helpers) to signal expected error conditions from
 * services/controllers so the centralized error handler can translate them
 * into safe, standardized responses.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = 'Bad request'): AppError {
    return new AppError(400, message);
  }

  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(401, message);
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(403, message);
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(404, message);
  }

  static conflict(message = 'Conflict'): AppError {
    return new AppError(409, message);
  }
}
