import { Router } from 'express';

import { UserRole } from '../../../generated/prisma/enums';
import { validateRequest } from '../../middleware/validateRequest';
import { auth } from '../../middleware/checkAuth';
import { zoneController } from './zone.controller';
import { zoneValidation } from './zone.validation';

const router = Router();

router.post(
  '/',
  auth(UserRole.ADMIN),
  validateRequest(zoneValidation.createZoneValidation),
  zoneController.createZone,
);

router.get('/', auth(UserRole.ADMIN), zoneController.getAllZones);

router.patch(
  '/:id',
  auth(UserRole.ADMIN),
  validateRequest(zoneValidation.updateZoneValidation),
  zoneController.updateZone,
);

router.patch('/:id/deactivate', auth(UserRole.ADMIN), zoneController.deactivateZone);

export const zoneRoutes = router;
