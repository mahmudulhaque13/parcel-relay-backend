import { Router } from 'express';
import { healthController } from './health.controller';

const router = Router();

// GET /api/v1/health
router.get('/', healthController.check);

export const healthRoutes = router;
