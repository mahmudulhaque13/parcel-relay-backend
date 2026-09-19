import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Baseline rate limiter applied to the whole API surface.
 *
 * Later phases add stricter, dedicated limiters for sensitive endpoints
 * (login, registration, refresh, payment initialization, public tracking).
 */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    errors: [{ path: '', message: 'Rate limit exceeded' }],
  },
});
