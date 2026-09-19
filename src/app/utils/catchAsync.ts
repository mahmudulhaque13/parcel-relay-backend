import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an async route handler so that rejected promises are forwarded to the
 * centralized error handler instead of crashing the process.
 */
export const catchAsync = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
