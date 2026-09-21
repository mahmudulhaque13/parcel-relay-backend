import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";

import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { pickupController } from "./pickup.controller";
import { pickupValidation } from "./pickup.validation";

const router = Router();

router.post(
  "/",
  auth(UserRole.CUSTOMER),
  validateRequest(pickupValidation.createPickupValidation),
  pickupController.createPickup,
);

router.patch(
  "/:id/status",
  auth(UserRole.COURIER),
  validateRequest(pickupValidation.updatePickupStatusValidation),
  pickupController.updatePickupStatus,
);

export const pickupRoutes = router;
