import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { sendResponse } from '../../utils/sendResponse';

/**
 * Lightweight liveness endpoint. Does not touch the database so it can be used
 * as a fast health probe by the platform (e.g. Render).
 */
const check = (_req: Request, res: Response): void => {
  sendResponse(res, {
    statusCode: 200,
    message: 'ParcelRelay API is healthy',
    data: {
      status: 'ok',
      environment: env.NODE_ENV,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
};

export const healthController = { check };
