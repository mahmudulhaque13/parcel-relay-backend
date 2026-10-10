import { Router } from "express";

import { trackingRateLimiter } from "../../middleware/rateLimiter";
import { trackingController } from "./tracking.controller";

const router = Router();

router.get(
  "/:trackingNumber",
  trackingRateLimiter,
  trackingController.getTrackingInfo,
);

export const trackingRoutes = router;
