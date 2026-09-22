import { Router } from 'express';

import { UserRole } from '../../../generated/prisma/enums';

import { auth } from '../../middleware/checkAuth';

import { validateRequest } from '../../middleware/validateRequest';

import { pickupController } from './pickup.controller';

import { pickupValidation } from './pickup.validation';

const router = Router();

router.post(
  '/shipments/:id/pickup',
  auth(UserRole.CUSTOMER),
  validateRequest(pickupValidation.createPickupValidation),
  pickupController.createPickup,
);

router.patch(
  '/shipments/:id/pickup',
  auth(UserRole.COURIER),
  validateRequest(pickupValidation.updatePickupStatusValidation),
  pickupController.updatePickupStatus,
);

router.get(
  '/shipments/:id/pickup',
  auth(UserRole.CUSTOMER, UserRole.COURIER),
  pickupController.getPickup,
);

export const pickupRoutes = router;
