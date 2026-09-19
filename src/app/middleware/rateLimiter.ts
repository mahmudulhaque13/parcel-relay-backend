import rateLimit from "express-rate-limit";
import config from "../config";

export const apiRateLimiter = rateLimit({
  windowMs: Number(config.rate_limit_window_ms),
  max: Number(config.rate_limit_max),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
    errors: [{ path: "", message: "Rate limit exceeded" }],
  },
});
