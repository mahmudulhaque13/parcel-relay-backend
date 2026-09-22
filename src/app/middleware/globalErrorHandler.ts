import type { ErrorRequestHandler } from 'express';

import { ZodError } from 'zod';

import config from '../config';

import type { TErrorSource } from '../interfaces/error.interface';

import { AppError } from '../utils/AppError';

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

  if (config.node_env === 'production' && statusCode === 500) {
    message = 'Internal server error';
    errors = [{ path: '', message }];
  }

  if (config.node_env !== 'production' && statusCode === 500) {
    console.error('[UnhandledError]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};
