import { Router } from "express";

import { UserRole } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middleware/validateRequest";
import { auth } from "../../middleware/checkAuth";
import { zoneController } from "./zone.controller";
import { zoneValidation } from "./zone.validation";

const router = Router();

router.post(
  "/",
  auth(UserRole.ADMIN),
  validateRequest(zoneValidation.createZoneValidation),
  zoneController.createZone,
);

export const zoneRoutes = router;
