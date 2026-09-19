import { Router } from 'express';
import { healthRoutes } from '../module/health/health.route';

const router = Router();

/**
 * Central registry for all `/api/v1` module routers.
 * New modules (auth, users, shipments, ...) are registered here in later phases.
 */
const moduleRoutes: Array<{ path: string; route: Router }> = [
  { path: '/health', route: healthRoutes },
];

for (const { path, route } of moduleRoutes) {
  router.use(path, route);
}

export const apiV1Router = router;
