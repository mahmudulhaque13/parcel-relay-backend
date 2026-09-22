import { Router } from 'express';

import { trackingController } from './tracking.controller';

const router = Router();

router.get('/:trackingNumber', trackingController.getTrackingInfo);

export const trackingRoutes = router;
