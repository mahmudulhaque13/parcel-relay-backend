import { Router } from 'express';

import { UserRole } from '../../../generated/prisma/enums';

import { auth } from '../../middleware/checkAuth';

import { validateRequest } from '../../middleware/validateRequest';

import { transferController } from './transfer.controller';

import { transferValidation } from './transfer.validation';

const router = Router();

router.post(
  '/admin/shipments/:id/transfers',
  auth(UserRole.ADMIN),
  validateRequest(transferValidation.createTransferValidation),
  transferController.createTransfer,
);

router.patch(
  '/admin/transfers/:id/dispatch',
  auth(UserRole.ADMIN),
  transferController.dispatchTransfer,
);

router.patch(
  '/admin/transfers/:id/receive',
  auth(UserRole.ADMIN),
  transferController.receiveTransfer,
);

router.patch(
  '/admin/transfers/:id/cancel',
  auth(UserRole.ADMIN),
  transferController.cancelTransfer,
);

router.get(
  '/shipments/:id/transfers',
  auth(UserRole.CUSTOMER, UserRole.COURIER, UserRole.ADMIN),
  transferController.getShipmentTransfers,
);

export const transferRoutes = router;
