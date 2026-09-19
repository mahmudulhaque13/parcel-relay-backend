import type { Response } from 'express';

export interface TMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TResponsePayload<T> {
  statusCode: number;
  message: string;
  data: T;
  meta?: TMeta;
}

/**
 * Standardized success response envelope used across every module:
 *
 * {
 *   "success": true,
 *   "message": "...",
 *   "meta": { ... },   // optional (pagination)
 *   "data": { ... }
 * }
 */
export const sendResponse = <T>(res: Response, payload: TResponsePayload<T>): void => {
  const { statusCode, message, data, meta } = payload;

  res.status(statusCode).json({
    success: true,
    message,
    ...(meta ? { meta } : {}),
    data,
  });
};
