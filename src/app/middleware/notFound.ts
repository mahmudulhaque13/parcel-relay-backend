import type { Request, Response } from 'express';

/**
 * Catch-all 404 handler for unmatched routes. Returns the standardized error
 * envelope so clients get a consistent shape for missing routes.
 */
export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: 'Requested resource not found',
    errors: [
      {
        path: req.originalUrl,
        message: `Cannot ${req.method} ${req.originalUrl}`,
      },
    ],
  });
};
