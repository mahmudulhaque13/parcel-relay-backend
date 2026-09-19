import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import type { TErrorSource } from '../interfaces/error.interface';
import { AppError } from '../utils/AppError';

/**
 * Centralized error handler.
 *
 * Translates known error types into the standardized error envelope with the
 * correct HTTP status code (400/401/403/404/409/500) and never leaks stack
 * traces, secrets, or database internals in production.
 */
export const globalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let statusCode = 500;
  let message = 'Something went wrong';
  let errors: TErrorSource[] = [];

  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation error';
    errors = err.issues.map((issue) => ({
      path: issue.path.join('.') || '(root)',
      message: issue.message,
    }));
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = [{ path: '', message: err.message }];
  } else if (err instanceof Error) {
    message = err.message || message;
    errors = [{ path: '', message }];
  }

  // Do not expose internal details for unexpected server errors in production.
  if (env.isProduction && statusCode === 500) {
    message = 'Internal server error';
    errors = [{ path: '', message }];
  }

  if (!env.isProduction && statusCode === 500) {
    console.error('[UnhandledError]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(env.isProduction ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  });
};
